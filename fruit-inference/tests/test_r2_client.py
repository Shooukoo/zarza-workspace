from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from infrastructure.r2_client import check_object_size


def test_check_object_size_passes_when_under_limit():
    s3 = MagicMock()
    s3.head_object.return_value = {"ContentLength": 1_000_000}

    check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    s3.head_object.assert_called_once_with(Bucket="bucket", Key="key")


def test_check_object_size_rejects_when_over_limit():
    s3 = MagicMock()
    s3.head_object.return_value = {"ContentLength": 10_000_000}

    with pytest.raises(HTTPException) as exc_info:
        check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    assert exc_info.value.status_code == 400


def test_check_object_size_raises_404_when_object_missing():
    s3 = MagicMock()
    s3.head_object.side_effect = Exception("NoSuchKey")

    with pytest.raises(HTTPException) as exc_info:
        check_object_size(s3, "bucket", "key", max_bytes=5_000_000)

    assert exc_info.value.status_code == 404
