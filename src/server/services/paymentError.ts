export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
