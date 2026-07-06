// zarza_ai/lib/domain/usecases/mark_read_usecase.dart
import '../repositories/i_notifications_repository.dart';

class MarkReadUseCase {
  const MarkReadUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call(String id) => _repository.markRead(id);
}
