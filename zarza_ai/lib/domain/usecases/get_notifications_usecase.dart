// zarza_ai/lib/domain/usecases/get_notifications_usecase.dart
import '../repositories/i_notifications_repository.dart';

class GetNotificationsUseCase {
  const GetNotificationsUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<NotificationsPage> call(int page, {int limit = 20}) =>
      _repository.fetchPage(page, limit: limit);
}
