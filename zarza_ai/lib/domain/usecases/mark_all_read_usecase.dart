import '../repositories/i_notifications_repository.dart';

class MarkAllReadUseCase {
  const MarkAllReadUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call() => _repository.markAllRead();
}
