import '../entities/campo_entity.dart';

abstract class ICamposRepository {
  Future<List<CampoEntity>> getCampos();
}
