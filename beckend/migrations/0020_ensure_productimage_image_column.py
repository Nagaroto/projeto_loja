# Safe migration to ensure productimage.image column exists
from django.db import migrations


def ensure_image_column(apps, schema_editor):
    """
    Verifica se a coluna 'image' existe na tabela beckend_productimage,
    e a cria se não existir.
    """
    with schema_editor.connection.cursor() as cursor:
        # Check if column exists (works for PostgreSQL and SQLite)
        if schema_editor.connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'beckend_productimage' 
                AND column_name = 'image';
            """)
        else:  # SQLite
            cursor.execute("""
                PRAGMA table_info(beckend_productimage);
            """)
            columns = [row[1] for row in cursor.fetchall()]
            if 'image' in columns:
                return
            # If it's SQLite and column doesn't exist, we'll add it
            cursor.execute("""
                ALTER TABLE beckend_productimage 
                ADD COLUMN image TEXT NULL;
            """)
            return
            
        # For PostgreSQL, check if the column exists
        column_exists = cursor.fetchone() is not None
        if not column_exists:
            cursor.execute("""
                ALTER TABLE beckend_productimage 
                ADD COLUMN image VARCHAR(255) NULL;
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('beckend', '0019_convert_productimage_to_cloudinary'),
    ]

    operations = [
        migrations.RunPython(ensure_image_column, migrations.RunPython.noop),
    ]
