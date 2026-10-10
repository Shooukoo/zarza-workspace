package com.rubusai.app.core.platform

/** Obtención del token de notificaciones push. */
interface PushTokenProvider

expect fun createPushTokenProvider(): PushTokenProvider
