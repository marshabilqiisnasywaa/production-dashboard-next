from sqlalchemy import and_, func, or_


def is_pic(summary, employee) -> bool:
    if summary.pic_id is not None:
        return summary.pic_id == employee.id
    return summary.pic_name.strip().lower() == employee.name.strip().lower()


def pic_filter(model, employee_ids: list[int], names: list[str]):
    return or_(
        model.pic_id.in_(employee_ids),
        and_(model.pic_id.is_(None), func.lower(func.trim(model.pic_name)).in_(names)),
    )
