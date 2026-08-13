from domain.dataset_export import bbox_to_yolo, resolve_class_id, split_dataset


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
