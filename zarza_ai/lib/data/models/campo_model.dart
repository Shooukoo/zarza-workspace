import '../../domain/entities/campo_entity.dart';

class CampoModel {
  const CampoModel({
    required this.id,
    required this.nombre,
    required this.codigoCampo,
  });

  final String id;
  final String nombre;
  final String codigoCampo;

  factory CampoModel.fromJson(Map<String, dynamic> json) => CampoModel(
        id: (json['id'] ?? json['_id']).toString(),
        nombre: json['nombre'] as String,
        codigoCampo: (json['codigoCampo'] ?? json['codigo_campo'] ?? '').toString(),
      );

  CampoEntity toEntity() => CampoEntity(
        id: id,
        nombre: nombre,
        codigoCampo: codigoCampo,
      );
}
