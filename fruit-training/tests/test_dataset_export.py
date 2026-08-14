import io

from PIL import Image

from domain.dataset_export import (
    bbox_to_yolo,
    export_dataset,
    resolve_class_id,
    split_dataset,
)


def test_bbox_to_yolo_normaliza_a_0_1():
    x_center, y_center, width, height = bbox_to_yolo((10, 20, 30, 60), img_width=100, img_height=200)

    assert x_center == 0.2
    assert y_center == 0.2
    assert width == 0.2
    assert height == 0.2


def test_resolve_class_id_usa_el_orden_de_class_names():
    assert resolve_class_id("boton") == 0
    assert resolve_class_id("enfermo") == 7


def test_split_dataset_es_reproducible_dentro_del_mismo_job():
    entries = [{"id": i} for i in range(10)]

    train_a, val_a = split_dataset(entries, "job-1")
    train_b, val_b = split_dataset(entries, "job-1")

    assert train_a == train_b
    assert val_a == val_b
    assert len(train_a) == 8
    assert len(val_a) == 2


def test_split_dataset_difiere_entre_jobs_distintos():
    entries = [{"id": i} for i in range(10)]

    train_job1, _ = split_dataset(entries, "job-1")
    train_job2, _ = split_dataset(entries, "job-2")

    assert train_job1 != train_job2


def _fake_jpeg_bytes(width=100, height=100) -> bytes:
    image = Image.new("RGB", (width, height), color="red")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


class DummyImageResponse:
    def __init__(self, content: bytes, status_code: int = 200):
        self.content = content
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


def test_export_dataset_escribe_estructura_ultralytics(tmp_path, monkeypatch):
    image_bytes = _fake_jpeg_bytes()

    def fake_get(url, timeout=None):
        return DummyImageResponse(image_bytes)

    monkeypatch.setattr("domain.dataset_export.httpx.get", fake_get)

    entries = [
        {
            "imageUrl": f"https://x/{i}.jpg",
            "detecciones": [{"clase": "naranja", "sano": True, "bbox": [10, 10, 50, 50]}],
        }
        for i in range(10)
    ]

    dataset_size = export_dataset(entries, "job-1", tmp_path)

    assert dataset_size == 10
    assert (tmp_path / "data.yaml").exists()
    train_images = list((tmp_path / "images" / "train").glob("*.jpg"))
    val_images = list((tmp_path / "images" / "val").glob("*.jpg"))
    assert len(train_images) == 8
    assert len(val_images) == 2
    train_labels = list((tmp_path / "labels" / "train").glob("*.txt"))
    assert len(train_labels) == 8
    label_content = train_labels[0].read_text()
    assert label_content.startswith("3 ")  # class_id de "naranja"


def test_export_dataset_omite_imagenes_inaccesibles(tmp_path, monkeypatch):
    def fake_get(url, timeout=None):
        raise Exception("connection refused")

    monkeypatch.setattr("domain.dataset_export.httpx.get", fake_get)

    entries = [
        {"imageUrl": "https://x/1.jpg", "detecciones": [{"clase": "naranja", "sano": True, "bbox": [1, 1, 2, 2]}]}
    ]

    dataset_size = export_dataset(entries, "job-1", tmp_path)

    assert dataset_size == 0


def test_export_dataset_conserva_las_imagenes_accesibles_de_un_lote_mixto(tmp_path, monkeypatch):
    image_bytes = _fake_jpeg_bytes()

    def fake_get(url, timeout=None):
        if url == "https://x/bad.jpg":
            raise Exception("connection refused")
        return DummyImageResponse(image_bytes)

    monkeypatch.setattr("domain.dataset_export.httpx.get", fake_get)

    entries = [
        {"imageUrl": "https://x/good.jpg", "detecciones": [{"clase": "naranja", "sano": True, "bbox": [1, 1, 2, 2]}]},
        {"imageUrl": "https://x/bad.jpg", "detecciones": [{"clase": "naranja", "sano": True, "bbox": [1, 1, 2, 2]}]},
    ]

    dataset_size = export_dataset(entries, "job-1", tmp_path)

    assert dataset_size == 1
    all_images = list((tmp_path / "images").rglob("*.jpg"))
    assert len(all_images) == 1
    assert all_images[0].read_bytes() == image_bytes
