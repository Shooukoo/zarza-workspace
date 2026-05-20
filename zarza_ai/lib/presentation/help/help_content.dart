import '../../domain/enums/user_role.dart'; // For UserRole enum

/// Single help item (title + content + optional image)
class HelpItem {
  final String title;
  final String content;
  final String? imagePath; // null if no image

  const HelpItem({
    required this.title,
    required this.content,
    this.imagePath,
  });
}

/// Help section containing multiple items, with role filtering
class HelpSection {
  final String id;
  final String title;
  final String description;
  final List<HelpItem> items;
  final List<UserRole> visibleForRoles;

  const HelpSection({
    required this.id,
    required this.title,
    required this.description,
    required this.items,
    required this.visibleForRoles,
  });

  /// Filter sections by user role
  static List<HelpSection> filterByRole(
    List<HelpSection> sections,
    UserRole userRole,
  ) {
    return sections
        .where((section) => section.visibleForRoles.contains(userRole))
        .toList();
  }
}

// ──────────────────────────────────────────────────────────────────
// Help Sections Data
// ──────────────────────────────────────────────────────────────────

final allHelpSections = <HelpSection>[
  // 1. Primeros Pasos
  HelpSection(
    id: 'getting-started',
    title: 'Primeros Pasos',
    description: 'Aprende lo básico de la app y cómo navegar.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Navegación Básica',
        content: 'La app tiene 4 pantallas principales:\n\n'
            '• Home: Ver resumen de cultivo y análisis recientes\n'
            '• Historial: Ver todos los análisis anteriores\n'
            '• Capturas Pendientes: Administrar imágenes en cola\n'
            '• Resultados: Detalles de un análisis específico\n\n'
            'Usa el menú inferior para cambiar entre pantallas.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Entender Roles y Permisos',
        content: 'Existen 4 roles en la app:\n\n'
            '• Productor: Captura imágenes y ve sus análisis\n'
            '• Agrólogo: Interpreta resultados y asesora\n'
            '• Monitor: Revisa análisis de otros productores\n'
            '• Admin: Gestiona usuarios y configuración\n\n'
            'Tu rol determina qué puedes hacer.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Acceder al Manual',
        content: 'Abre el menú de navegación (ícono ☰) y presiona '
            '"📖 Manual de Usuario" para ver todas las guías disponibles.',
        imagePath: null,
      ),
    ],
  ),
  // 2. Captura de Análisis
  HelpSection(
    id: 'capture',
    title: 'Captura de Análisis',
    description: 'Cómo tomar fotos y enviar para análisis.',
    visibleForRoles: [UserRole.productor, UserRole.agronomo],
    items: [
      HelpItem(
        title: 'Acceder a Captura',
        content: 'En la pantalla Home, presiona el botón grande '
            '"📷 Capturar Análisis" para abrir la cámara.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Alinear la Fruta Correctamente',
        content: 'Posiciona la fruta dentro del círculo de alineación. '
            'La fruta debe estar:\n\n'
            '• Bien iluminada (sin sombras)\n'
            '• Visible completamente\n'
            '• Centrada en el visor\n'
            '• A distancia clara (unos 15cm)\n\n'
            'Espera a que el círculo se ponga verde para proceder.',
        imagePath: 'assets/help_images/capture_alignment.png',
      ),
      HelpItem(
        title: 'Presionar Captura',
        content: 'Una vez alineada, presiona el botón circular azul '
            'en la parte inferior para capturar la imagen.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Esperar Procesamiento',
        content: 'La imagen se envía al servidor para análisis con IA. '
            'Esto puede tomar 10-30 segundos según tu conexión. '
            'Verás una barra de progreso.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Qué Hacer si Falla?',
        content: 'Si ves un mensaje de error:\n\n'
            '1. Verifica tu conexión a internet\n'
            '2. Presiona "Reintentar"\n'
            '3. Si persiste, ve a "Capturas Pendientes" para reintentar después',
        imagePath: null,
      ),
    ],
  ),
  // 3. Interpretar Resultados
  HelpSection(
    id: 'results',
    title: 'Interpretar Resultados',
    description: 'Entiende qué significan los números y gráficos.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Salud del Cultivo (%)',
        content: 'Es el porcentaje de frutas sanas detectadas.\n\n'
            '• 100% = Todas las frutas analizadas están sanas\n'
            '• 0% = Todas tienen alguna enfermedad\n'
            '• Verde (≥70%) = Estado óptimo\n'
            '• Rojo (<70%) = Requiere atención',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detectados vs Sanos',
        content: '"Detectados" = Cantidad total de frutas analizadas\n'
            '"Sanos" = Cuántas de esas no tienen enfermedades\n\n'
            'Ejemplo: "7 detectados · 5 sanos" = 7 frutas, 5 sin enfermedad',
        imagePath: null,
      ),
      HelpItem(
        title: 'Etapas Fenológicas (Stage 1-7)',
        content: 'Muestran el estado de desarrollo de cada fruta:\n\n'
            '• Stage 1-2: Inicio de desarrollo\n'
            '• Stage 3-4: Desarrollo intermedio\n'
            '• Stage 5-6: Maduración\n'
            '• Stage 7: Cosecha próxima\n\n'
            'Útil para planificar cuándo cosechar.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detección de Enfermedades',
        content: 'Cada enfermedad muestra un % de confianza.\n\n'
            '• >90%: Muy probable que tenga esa enfermedad\n'
            '• 70-90%: Probable\n'
            '• <70%: Posible pero revisar visualmente\n\n'
            'La IA mejora con cada análisis.',
        imagePath: null,
      ),
    ],
  ),
  // 4. Conceptos Clave (Glosario)
  HelpSection(
    id: 'glossary',
    title: 'Conceptos Clave',
    description: 'Definiciones de términos importantes.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Salud del Cultivo',
        content: 'Métrica que indica qué porcentaje de frutas están '
            'sanas (sin enfermedades detectadas). Se calcula dividiendo '
            'frutas sanas entre frutas totales analizadas.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detección de Frutas',
        content: 'El sistema usa visión computacional (IA) para identificar '
            'frutas en la imagen y extraer sus características.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Fruta Sana vs Enferma',
        content: 'Sana: Sin ninguna enfermedad o daño detectado.\n'
            'Enferma: Presenta uno o más problemas fitosanitarios '
            '(plagas, hongos, deficiencias).',
        imagePath: null,
      ),
      HelpItem(
        title: 'Etapas Fenológicas',
        content: 'Fases de desarrollo de una fruta desde floración hasta '
            'cosecha. Se usan para determinar el mejor momento de recolección.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Confianza de Detección',
        content: 'Porcentaje (0-100%) que indica qué tan seguro está '
            'el sistema de que la fruta tiene esa enfermedad. Mayor % = mayor certeza.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Merma',
        content: 'Pérdida esperada de fruta por daños o enfermedades. '
            'Útil para planificar y pronosticar rendimiento.',
        imagePath: null,
      ),
    ],
  ),
  // 5. Solución de Problemas (FAQ)
  HelpSection(
    id: 'troubleshooting',
    title: 'Solución de Problemas',
    description: 'Respuestas a preguntas frecuentes.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: '¿Qué significa "Error en captura"?',
        content: 'La imagen no se pudo procesar. Posibles causas:\n\n'
            '• Sin conexión a internet\n'
            '• Imagen muy borrosa\n'
            '• Fruta no visible\n\n'
            'Solución: Intenta de nuevo con mejor iluminación.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Por qué tarda tanto el análisis?',
        content: 'El análisis con IA toma 10-30 segundos. Depende de:\n\n'
            '• Velocidad de tu conexión\n'
            '• Carga actual del servidor\n'
            '• Complejidad de la imagen\n\n'
            'Esto es normal, espera sin cerrar la app.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Puedo ver análisis anteriores?',
        content: 'Sí, ve a la pantalla "Historial" para ver todos '
            'los análisis pasados. Presiona cualquiera para ver detalles.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Qué hago si no tengo internet?',
        content: 'Las capturas en modo offline se guardan en "Capturas Pendientes". '
            'Cuando recuperes conexión, se enviarán automáticamente.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Cómo borro un análisis?',
        content: 'En la pantalla de resultados, hay un botón ⋮ (tres puntos). '
            'Presiona y selecciona "Eliminar". Esto no se puede deshacer.',
        imagePath: null,
      ),
    ],
  ),
  // 6. Gestión de Campos/Solicitudes
  HelpSection(
    id: 'fields-requests',
    title: 'Gestión de Campos y Solicitudes',
    description: 'Administra campos y solicitudes de muestreo.',
    visibleForRoles: [
      UserRole.productor,
      UserRole.agronomo,
      UserRole.admin,
    ],
    items: [
      HelpItem(
        title: 'Agregar un Nuevo Campo',
        content: 'En el menú, selecciona "Campos" → "Agregar". '
            'Completa nombre, ubicación (GPS) y cultivo. '
            'Presiona guardar.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Crear una Solicitud de Muestreo',
        content: 'Una solicitud es una tarea de muestreo en un campo específico. '
            'Selecciona el campo, define el área a muestrear y presiona "Crear". '
            'Se asignará a un agrólogo o monitor.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Ver Solicitudes Asignadas',
        content: 'Ve a "Solicitudes Pendientes" para ver todas tus tareas. '
            'Cada una muestra campo, prioridad y fecha límite.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Cambiar el Campo Activo',
        content: 'En Home, presiona el selector de campo (parte superior) '
            'para cambiar a otro campo y ver sus análisis.',
        imagePath: null,
      ),
    ],
  ),
];
