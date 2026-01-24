import {
  ArgumentsHost,
  CanActivate,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { Response } from "express";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const b64auth = request.headers.authorization;

    if (b64auth) {
      const [username, password] = Buffer.from(b64auth.split(" ").reverse()[0], "base64")
        .toString()
        .split(":");

      if (
        username === process.env.ADMIN_USER &&
        password === process.env.ADMIN_PASS
      ) {
        return true;
      }
    }

    const response = context.switchToHttp().getResponse();
    response.set("WWW-Authenticate", 'Basic realm="Authentication required."');

    throw new UnauthorizedException();
  }
}

@Catch(UnauthorizedException)
export class AdminFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).end();
  }
}
