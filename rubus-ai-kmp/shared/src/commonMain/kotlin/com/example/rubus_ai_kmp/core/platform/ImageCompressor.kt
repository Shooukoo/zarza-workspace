package com.example.rubus_ai_kmp.core.platform

/** Compresión de imágenes antes de subirlas. */
interface ImageCompressor

expect fun createImageCompressor(): ImageCompressor
