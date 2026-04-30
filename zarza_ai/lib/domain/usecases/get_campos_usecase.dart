import '../entities/campo_entity.dart';
import '../repositories/i_campos_repository.dart';

class GetCamposUseCase {
  const GetCamposUseCase(this._repository);
  final ICamposRepository _repository;

  Future<List<CampoEntity>> call() => _repository.getCampos();
}
