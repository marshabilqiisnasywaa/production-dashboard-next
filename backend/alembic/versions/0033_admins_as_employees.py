"""admins as employees

Revision ID: 0033
Revises: 0032
Create Date: 2026-11-03 15:00:00.000000

Memindahkan akun di tabel users menjadi karyawan berperan admin atau superadmin,
lalu mengalihkan leader_assignments.created_by_user_id ke employees.
Tabel users dibiarkan (tidak dihapus) sampai semua pemakaiannya terbukti tidak ada.
"""
from alembic import op
import sqlalchemy as sa


revision = '0033'
down_revision = '0032'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    users = connection.execute(sa.text(
        "SELECT id, username, password_hash, role, is_active, must_change_password, created_at FROM users ORDER BY id"
    )).all()

    employee_ids: dict[int, int] = {}
    for user in users:
        taken = connection.execute(
            sa.text("SELECT id, role FROM employees WHERE employee_no = :nik"), {"nik": user.username}
        ).first()
        if taken is not None and taken.role in ("admin", "superadmin"):
            employee_ids[user.id] = taken.id
            continue
        if taken is not None:
            raise RuntimeError(
                f"NIK '{user.username}' sudah dipakai karyawan berperan '{taken.role}'. "
                "Ganti NIK karyawan itu dulu, lalu jalankan migrasi lagi."
            )
        employee_ids[user.id] = connection.execute(sa.text(
            "INSERT INTO employees (employee_no, name, role, password_hash, must_change_password, is_active, created_at) "
            "VALUES (:nik, :name, :role, :password_hash, :must_change, :is_active, :created_at) RETURNING id"
        ), {
            "nik": user.username,
            "name": user.username,
            "role": user.role,
            "password_hash": user.password_hash,
            "must_change": user.must_change_password,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }).scalar_one()

    op.add_column('leader_assignments', sa.Column('created_by_employee_id', sa.Integer(), nullable=True))
    for user_id, employee_id in employee_ids.items():
        connection.execute(
            sa.text("UPDATE leader_assignments SET created_by_employee_id = :employee WHERE created_by_user_id = :user"),
            {"employee": employee_id, "user": user_id},
        )
    op.alter_column('leader_assignments', 'created_by_employee_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        'leader_assignments_created_by_employee_id_fkey',
        'leader_assignments', 'employees', ['created_by_employee_id'], ['id'], ondelete='RESTRICT',
    )
    op.create_index(
        op.f('ix_leader_assignments_created_by_employee_id'),
        'leader_assignments', ['created_by_employee_id'], unique=False,
    )
    op.drop_column('leader_assignments', 'created_by_user_id')


def downgrade() -> None:
    connection = op.get_bind()

    admins = connection.execute(sa.text(
        "SELECT id, employee_no, password_hash, role, is_active, must_change_password, created_at "
        "FROM employees WHERE role IN ('admin', 'superadmin') ORDER BY id"
    )).all()

    user_ids: dict[int, int] = {}
    for admin in admins:
        existing = connection.execute(
            sa.text("SELECT id FROM users WHERE username = :nik"), {"nik": admin.employee_no}
        ).first()
        user_ids[admin.id] = existing.id if existing is not None else connection.execute(sa.text(
            "INSERT INTO users (username, password_hash, role, is_active, must_change_password, created_at) "
            "VALUES (:nik, :password_hash, :role, :is_active, :must_change, :created_at) RETURNING id"
        ), {
            "nik": admin.employee_no,
            "password_hash": admin.password_hash or "",
            "role": admin.role,
            "is_active": admin.is_active,
            "must_change": admin.must_change_password,
            "created_at": admin.created_at,
        }).scalar_one()

    op.add_column('leader_assignments', sa.Column('created_by_user_id', sa.Integer(), nullable=True))
    for employee_id, user_id in user_ids.items():
        connection.execute(
            sa.text("UPDATE leader_assignments SET created_by_user_id = :user WHERE created_by_employee_id = :employee"),
            {"user": user_id, "employee": employee_id},
        )
    fallback = connection.execute(sa.text("SELECT id FROM users ORDER BY id LIMIT 1")).first()
    if fallback is not None:
        connection.execute(
            sa.text("UPDATE leader_assignments SET created_by_user_id = :user WHERE created_by_user_id IS NULL"),
            {"user": fallback.id},
        )
    op.alter_column('leader_assignments', 'created_by_user_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        'leader_assignments_created_by_user_id_fkey',
        'leader_assignments', 'users', ['created_by_user_id'], ['id'], ondelete='RESTRICT',
    )
    op.drop_index(op.f('ix_leader_assignments_created_by_employee_id'), table_name='leader_assignments')
    op.drop_column('leader_assignments', 'created_by_employee_id')
