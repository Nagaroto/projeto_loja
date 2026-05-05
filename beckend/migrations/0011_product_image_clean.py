# Create ProductImage model - Clean migration

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('beckend', '0010_add_promotion_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(help_text='URL da imagem do produto', verbose_name='URL da Imagem')),
                ('filename', models.CharField(help_text='Nome do arquivo da imagem', max_length=255, verbose_name='Nome do Arquivo')),
                ('is_cover', models.BooleanField(default=False, help_text='Se esta imagem é a capa do produto', verbose_name='Imagem de Capa')),
                ('order', models.PositiveIntegerField(default=0, help_text='Ordem de exibição da imagem', verbose_name='Ordem')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Data de Criação')),
                ('product', models.ForeignKey(help_text='Produto ao qual esta imagem pertence', on_delete=django.db.models.deletion.CASCADE, related_name='images', to='beckend.product', verbose_name='Produto')),
            ],
            options={
                'verbose_name': 'Imagem do Produto',
                'verbose_name_plural': 'Imagens dos Produtos',
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='productimage',
            unique_together={('product', 'filename')},
        ),
    ]
