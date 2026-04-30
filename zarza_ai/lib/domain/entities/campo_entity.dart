import 'package:equatable/equatable.dart';

class CampoEntity extends Equatable {
  const CampoEntity({required this.id, required this.nombre, required this.codigoCampo});

  final String id;
  final String nombre;
  final String codigoCampo;

  @override
  List<Object?> get props => [id];
}
