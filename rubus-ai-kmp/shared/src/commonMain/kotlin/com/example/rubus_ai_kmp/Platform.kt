package com.example.rubus_ai_kmp

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform