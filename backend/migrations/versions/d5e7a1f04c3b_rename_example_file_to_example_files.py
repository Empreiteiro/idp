"""rename example_file to example_files

Revision ID: d5e7a1f04c3b
Revises: c4a1e8f93b2d
Create Date: 2026-03-27 12:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e7a1f04c3b'
down_revision: Union[str, None] = 'c4a1e8f93b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN RENAME natively, so we use batch mode
    with op.batch_alter_table('templates', schema=None) as batch_op:
        batch_op.alter_column('example_file', new_column_name='example_files', type_=sa.Text())

    # Migrate existing single-path values to JSON arrays
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, example_files FROM templates WHERE example_files IS NOT NULL")).fetchall()
    for row in rows:
        val = row[1]
        # Skip if already a JSON array
        if val and not val.startswith("["):
            conn.execute(
                sa.text("UPDATE templates SET example_files = :files WHERE id = :id"),
                {"files": json.dumps([val]), "id": row[0]},
            )


def downgrade() -> None:
    # Convert JSON arrays back to single paths
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, example_files FROM templates WHERE example_files IS NOT NULL")).fetchall()
    for row in rows:
        val = row[1]
        if val and val.startswith("["):
            files = json.loads(val)
            single = files[0] if files else None
            conn.execute(
                sa.text("UPDATE templates SET example_files = :file WHERE id = :id"),
                {"file": single, "id": row[0]},
            )

    with op.batch_alter_table('templates', schema=None) as batch_op:
        batch_op.alter_column('example_files', new_column_name='example_file', type_=sa.String(500))
