from pathlib import Path


class FakeMetrics:
    class Box:
        map50 = 0.812

    box = Box()


class FakeYOLO:
    instances: list["FakeYOLO"] = []

    def __init__(self, model_path):
        self.model_path = model_path
        self.train_calls = []
        self.val_calls = []
        FakeYOLO.instances.append(self)

    def train(self, **kwargs):
        self.train_calls.append(kwargs)

    def val(self, **kwargs):
        self.val_calls.append(kwargs)
        return FakeMetrics()


def test_run_training_construye_yolo_con_el_modelo_base_y_llama_train(monkeypatch):
    FakeYOLO.instances.clear()
    monkeypatch.setattr("domain.training.YOLO", FakeYOLO)

    from domain.training import run_training

    model = run_training("base.pt", Path("data.yaml"), epochs=25)

    assert model.model_path == "base.pt"
    assert model.train_calls == [
        {"data": "data.yaml", "epochs": 25, "imgsz": 640, "patience": 10}
    ]


def test_evaluate_retorna_map50_como_float(monkeypatch):
    monkeypatch.setattr("domain.training.YOLO", FakeYOLO)

    from domain.training import evaluate

    model = FakeYOLO("base.pt")
    m_ap = evaluate(model, Path("data.yaml"))

    assert m_ap == 0.812
    assert isinstance(m_ap, float)
    assert model.val_calls == [{"data": "data.yaml"}]
