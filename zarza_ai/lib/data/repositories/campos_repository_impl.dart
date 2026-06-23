import '../../domain/entities/campo_entity.dart';
import '../../domain/repositories/i_campos_repository.dart';
import '../datasources/remote_campos_datasource.dart';

class CamposRepositoryImpl implements ICamposRepository {
  CamposRepositoryImpl(this._datasource);
  final RemoteCamposDatasource _datasource;

  List<CampoEntity>? _cache;
  DateTime? _cacheTime;
  static const _ttl = Duration(minutes: 5);

  @override
  Future<List<CampoEntity>> getCampos() async {
    final isFresh = _cache != null &&
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!) < _ttl;
    if (isFresh) return _cache!;

    try {
      final models = await _datasource.getCampos();
      _cache = models.map((m) => m.toEntity()).toList();
      _cacheTime = DateTime.now();
      return _cache!;
    } on Object {
      if (_cache != null) return _cache!;
      rethrow;
    }
  }
}
