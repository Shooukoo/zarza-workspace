from pathlib import Path
from unittest.mock import MagicMock

from infrastructure.r2_client import download_model_file, upload_model_file


def test_download_model_file_calls_s3_download_file():
    s3 = MagicMock()
    dest = Path("/tmp/base_model.pt")

    download_model_file(s3, "bucket", "models/best_v1.pt", dest)

    s3.download_file.assert_called_once_with("bucket", "models/best_v1.pt", str(dest))


def test_upload_model_file_returns_key_with_job_id_and_calls_s3_upload_file():
    s3 = MagicMock()
    local_path = Path("/tmp/best_job-123.pt")

    key = upload_model_file(s3, "bucket", local_path, "job-123")

    assert key == "models/best_job-123.pt"
    s3.upload_file.assert_called_once_with(str(local_path), "bucket", "models/best_job-123.pt")
