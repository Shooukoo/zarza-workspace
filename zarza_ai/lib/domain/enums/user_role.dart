/// Espeja el enum `Role` del backend NestJS.
enum UserRole {
  admin,
  productor,
  agronomo,
  monitor;

  /// Parsea el string que viene del servidor (case-insensitive).
  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (r) => r.name.toUpperCase() == value.toUpperCase(),
      orElse: () => UserRole.monitor,
    );
  }

  /// Nombre legible en español para mostrar en la UI.
  String get displayName {
    return switch (this) {
      UserRole.admin => 'Administrador',
      UserRole.productor => 'Productor',
      UserRole.agronomo => 'Agrónomo',
      UserRole.monitor => 'Monitor',
    };
  }

  /// Solo los admins pueden crear nuevos usuarios.
  bool get canCreateUsers => this == UserRole.admin;
}

