package com.rubusai.app.feature.capture

import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.UploadOutcome
import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import kotlinx.coroutines.CompletableDeferred

internal class FakeCamposRepository(
    var result: CamposResult = CamposResult.Success(emptyList()),
) : CamposRepository {
    var calls = 0

    override suspend fun list(): CamposResult {
        calls++
        return result
    }
}

internal class FakeIngestionRepository : IngestionRepository {
    var outcome: UploadOutcome = UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg"))
    var gate: CompletableDeferred<Unit>? = null
    val uploads = mutableListOf<Pair<ByteArray, UploadMetadata>>()

    override suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome {
        uploads += jpeg to metadata
        gate?.await()
        return outcome
    }
}

internal class FakeImageCompressor(var bytes: ByteArray = "jpeg".encodeToByteArray()) : ImageCompressor {
    var failure: Exception? = null
    val paths = mutableListOf<String>()

    override suspend fun compress(path: String): ByteArray {
        paths += path
        failure?.let { throw it }
        return bytes
    }
}

internal class FakeLocationProvider(
    var coordinates: Coordinates? = Coordinates(19.4326, -99.1332),
) : LocationProvider {
    var calls = 0

    override suspend fun current(): Coordinates? {
        calls++
        return coordinates
    }
}
