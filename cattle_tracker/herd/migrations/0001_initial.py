# Generated by Django 4.2.9 on 2025-07-20 08:54

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Cattle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tag_number', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(blank=True, max_length=100)),
                ('sex', models.CharField(choices=[('cow', 'Cow'), ('bull', 'Bull'), ('steer', 'Steer'), ('heifer', 'Heifer'), ('calf', 'Calf')], max_length=10)),
                ('dob', models.DateField(blank=True, null=True)),
                ('color', models.CharField(max_length=50)),
                ('breed', models.CharField(max_length=50)),
                ('horn_status', models.CharField(max_length=50)),
                ('status', models.CharField(choices=[('active', 'Active'), ('archived', 'Archived')], default='active', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('dam', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dam_offspring', to='herd.cattle')),
                ('sire', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sire_offspring', to='herd.cattle')),
            ],
            options={
                'verbose_name_plural': 'Cattle',
                'ordering': ['tag_number'],
            },
        ),
        migrations.CreateModel(
            name='Photo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_path', models.ImageField(upload_to='cattle_photos/')),
                ('capture_time', models.DateTimeField(blank=True, null=True)),
                ('exif', models.JSONField(default=dict)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='PhotoCattle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cattle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='herd.cattle')),
                ('photo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='herd.photo')),
            ],
            options={
                'verbose_name_plural': 'Photo cattle relationships',
                'unique_together': {('photo', 'cattle')},
            },
        ),
    ]
