from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.flowchart import Flowchart
from app.schemas_flowchart import (
    FlowchartCreate,
    FlowchartListItem,
    FlowchartOut,
    FlowchartUpdate,
)
from app.services.flowchart_images import (
    FlowchartImageError,
    delete,
    file_path,
    media_type,
    save,
)

router = APIRouter(prefix="/flowcharts", tags=["flowcharts"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024


def flowchart_list_item(row: Flowchart) -> FlowchartListItem:
    return FlowchartListItem(
        id=row.id,
        title=row.title,
        kind=row.kind,
        imageUrl="/api/flowcharts/image/" + row.image_name if row.image_name else None,
        sortOrder=row.sort_order,
        updatedAt=row.updated_at,
    )


def flowchart_out(row: Flowchart) -> FlowchartOut:
    return FlowchartOut(
        id=row.id,
        title=row.title,
        kind=row.kind,
        imageUrl="/api/flowcharts/image/" + row.image_name if row.image_name else None,
        sortOrder=row.sort_order,
        updatedAt=row.updated_at,
        board=row.board,
    )


@router.get("", response_model=list[FlowchartListItem])
def list_flowcharts(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Flowchart).order_by(Flowchart.sort_order, Flowchart.id)
    )
    return [flowchart_list_item(row) for row in rows]


@router.get("/image/{name}")
def get_flowchart_image(name: str) -> FileResponse:
    path = file_path(name)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gambar flowchart tidak ditemukan.")
    return FileResponse(
        path,
        media_type=media_type(name),
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/{flowchart_id}", response_model=FlowchartOut)
def get_flowchart(flowchart_id: int, db: Session = Depends(get_db)):
    row = db.get(Flowchart, flowchart_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flowchart tidak ditemukan.")
    return flowchart_out(row)


@router.post("", response_model=FlowchartOut, status_code=status.HTTP_201_CREATED)
def create_flowchart(
    payload: FlowchartCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    board = payload.board if payload.kind == "board" else None
    row = Flowchart(
        title=payload.title,
        kind=payload.kind,
        board=board,
        image_name=None,
        sort_order=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return flowchart_out(row)


@router.patch("/{flowchart_id}", response_model=FlowchartOut)
def update_flowchart(
    flowchart_id: int,
    payload: FlowchartUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = db.get(Flowchart, flowchart_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flowchart tidak ditemukan.")

    fields = payload.model_fields_set
    if "title" in fields and payload.title is not None:
        row.title = payload.title
    if "sort_order" in fields and payload.sort_order is not None:
        row.sort_order = payload.sort_order
    if "board" in fields:
        if row.kind != "board":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Hanya flowchart board yang boleh memiliki data board.")
        row.board = payload.board

    db.commit()
    db.refresh(row)
    return flowchart_out(row)


@router.delete("/{flowchart_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flowchart(
    flowchart_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> Response:
    row = db.get(Flowchart, flowchart_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flowchart tidak ditemukan.")
    old_name = row.image_name
    db.delete(row)
    db.commit()
    delete(old_name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{flowchart_id}/image", response_model=FlowchartListItem)
def upload_flowchart_image(
    flowchart_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    row = db.get(Flowchart, flowchart_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flowchart tidak ditemukan.")
    if row.kind != "image":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Upload gambar hanya untuk flowchart gambar.")

    data = image.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Gambar maksimal 10 MB.")

    try:
        name = save(data)
    except FlowchartImageError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    old_name = row.image_name
    row.image_name = name
    db.commit()
    db.refresh(row)
    delete(old_name)
    return flowchart_list_item(row)
