package com.example.rubus_ai_kmp.core.platform

/** Obtención del token de notificaciones push. */
interface PushTokenProvider

expect fun createPushTokenProvider(): PushTokenProvider
