import '../../domain/entities/campo_entity.dart';
import '../../domain/repositories/i_campos_repository.dart';
import '../datasources/remote_campos_datasource.dart';

class CamposRepositoryImpl implements ICamposRepository {
  CamposRepositoryImpl(this._datasource);
  final RemoteCamposDatasource _datasource;

  @override
  Future<List<CampoEntity>> getCampos() async {
    final models = await _datasource.getCampos();
    return models.map((m) => m.toEntity()).toList();
  }
}
