"""add insight templates and document insights

Revision ID: c4a1e8f93b2d
Revises: b289b302a16d
Create Date: 2026-03-25 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a1e8f93b2d'
down_revision: Union[str, None] = 'b289b302a16d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Insight Templates
    op.create_table(
        'insight_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_insight_templates_template_id', 'insight_templates', ['template_id'])
    op.create_index('ix_insight_templates_created_at', 'insight_templates', ['created_at'])

    # Insight Template Sections
    op.create_table(
        'insight_template_sections',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('insight_template_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('prompt_hint', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['insight_template_id'], ['insight_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('insight_template_id', 'title', name='uq_insight_section_title'),
    )
    op.create_index('ix_insight_template_sections_insight_template_id', 'insight_template_sections', ['insight_template_id'])

    # Document Insights
    op.create_table(
        'document_insights',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('insight_template_id', sa.Integer(), nullable=True),
        sa.Column('analysis_mode', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['insight_template_id'], ['insight_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_document_insights_insight_template_id', 'document_insights', ['insight_template_id'])
    op.create_index('ix_document_insights_status', 'document_insights', ['status'])
    op.create_index('ix_document_insights_created_at', 'document_insights', ['created_at'])

    # Association table
    op.create_table(
        'document_insight_documents',
        sa.Column('insight_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['insight_id'], ['document_insights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('insight_id', 'document_id'),
    )


def downgrade() -> None:
    op.drop_table('document_insight_documents')
    op.drop_table('document_insights')
    op.drop_table('insight_template_sections')
    op.drop_table('insight_templates')
