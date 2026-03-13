import '../repositories/i_notifications_repository.dart';

class WatchNotificationsUseCase {
  const WatchNotificationsUseCase(this._repository);
  final INotificationsRepository _repository;

  Stream<String> call() => _repository.watchNotifications();
}
