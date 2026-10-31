package com.rubusai.app.core.platform

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import androidx.exifinterface.media.ExifInterface
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.io.FileOutputStream
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidImageCompressorTest {

    private val compressor = AndroidImageCompressor()
    private val cacheDir = InstrumentationRegistry.getInstrumentation().targetContext.cacheDir

    private val tempFiles = mutableListOf<File>()

    private fun tempFile(prefix: String) = File.createTempFile(prefix, ".jpg", cacheDir).also { tempFiles += it }

    @After
    fun limpiarTemporales() {
        tempFiles.forEach { it.delete() }
        tempFiles.clear()
    }

    private fun writeJpeg(width: Int, height: Int, orientation: Int? = null, withGps: Boolean = false): String {
        val file = tempFile("test")
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { it.eraseColor(Color.RED) }
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it) }
        bitmap.recycle()
        if (orientation != null || withGps) {
            ExifInterface(file).apply {
                orientation?.let { setAttribute(ExifInterface.TAG_ORIENTATION, it.toString()) }
                if (withGps) {
                    setAttribute(ExifInterface.TAG_GPS_LATITUDE, "19/1,25/1,0/1")
                    setAttribute(ExifInterface.TAG_GPS_LATITUDE_REF, "N")
                    setAttribute(ExifInterface.TAG_GPS_LONGITUDE, "99/1,8/1,0/1")
                    setAttribute(ExifInterface.TAG_GPS_LONGITUDE_REF, "W")
                }
                saveAttributes()
            }
        }
        return file.path
    }

    private fun decode(bytes: ByteArray) = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)

    @Test
    fun reduceUnaImagenGrandeAlLadoMaximo() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(4000, 3000)))

        assertEquals(2048, out.width)
        assertEquals(1536, out.height)
    }

    @Test
    fun noAgrandaUnaImagenPequena() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(800, 600)))

        assertEquals(800, out.width)
        assertEquals(600, out.height)
    }

    @Test
    fun aplicaLaOrientacionExifALosPixeles() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(400, 200, orientation = ExifInterface.ORIENTATION_ROTATE_90)))

        assertEquals(200, out.width)
        assertEquals(400, out.height)
    }

    @Test
    fun elResultadoNoTraeNiOrientacionNiCoordenadas() = runBlocking {
        val bytes = compressor.compress(
            writeJpeg(400, 200, orientation = ExifInterface.ORIENTATION_ROTATE_90, withGps = true),
        )
        val file = tempFile("out").apply { writeBytes(bytes) }

        val exif = ExifInterface(file)

        assertEquals(0, exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, 0))
        assertNull(exif.getAttribute(ExifInterface.TAG_GPS_LATITUDE))
        assertNull(exif.getAttribute(ExifInterface.TAG_GPS_LONGITUDE))
    }

    @Test
    fun unArchivoQueNoEsUnaImagenFalla() {
        val file = tempFile("texto").apply { writeText("no soy una imagen") }

        assertFailsWith<ImageCompressionException> { runBlocking { compressor.compress(file.path) } }
    }

    @Test
    fun unArchivoInexistenteFalla() {
        assertFailsWith<ImageCompressionException> { runBlocking { compressor.compress("/no/existe.jpg") } }
    }
}
