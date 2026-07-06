// zarza_ai/lib/domain/usecases/delete_notification_usecase.dart
import '../repositories/i_notifications_repository.dart';

class DeleteNotificationUseCase {
  const DeleteNotificationUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call(String id) => _repository.delete(id);
}
