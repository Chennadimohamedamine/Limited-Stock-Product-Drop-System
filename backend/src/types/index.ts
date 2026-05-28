export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    Object.setPrototypeOf(this, new TargetConcrete(this));
  }
}
const TargetConcrete = Object.getPrototypeOf;