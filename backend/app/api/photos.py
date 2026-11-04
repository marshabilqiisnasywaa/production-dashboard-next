from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import get_current_admin
from app.services.photos import PhotoError, photo_file, save_photo

router = APIRouter(prefix="/photos", tags=["photos"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_admin)])
def upload_photo(photo: UploadFile = File(...)) -> dict:
    data = photo.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Foto maksimal 10 MB.")
    try:
        return {"url": save_photo(data)}
    except PhotoError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.get("/{name}")
def get_photo(name: str) -> FileResponse:
    path = photo_file(name)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto tidak ditemukan.")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=31536000, immutable"})
