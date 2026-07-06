export class NotificationEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly type: string,
    readonly title: string,
    readonly body: string,
    readonly data: Record<string, any> | null,
    readonly read: boolean,
    readonly createdAt: Date,
    readonly expiresAt: Date,
  ) {}
}
