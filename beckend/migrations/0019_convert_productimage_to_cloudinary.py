# Generated manually - Convert ProductImage from URLField to ImageField with Cloudinary

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beckend', '0018_orderitem_product_optional'),
    ]

    operations = [
        # Remove unique_together que dependia de filename
        migrations.AlterUniqueTogether(
            name='productimage',
            unique_together=set(),
        ),
        # Remove campo url antigo
        migrations.RemoveField(
            model_name='productimage',
            name='url',
        ),
        # Remove campo filename antigo
        migrations.RemoveField(
            model_name='productimage',
            name='filename',
        ),
        # Adiciona novo campo image (ImageField com Cloudinary)
        migrations.AddField(
            model_name='productimage',
            name='image',
            field=models.ImageField(
                upload_to='products/',
                verbose_name='Imagem',
                help_text='Arquivo de imagem do produto (salvo no Cloudinary)',
                null=True,
                blank=True,
            ),
        ),
    ]
