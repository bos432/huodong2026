import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter } from "./api-exception.filter";

function httpHost(response: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }): ArgumentsHost {
  return {
    switchToHttp() {
      return {
        getRequest() {
          return {
            requestId: "req-upload-limit",
            originalUrl: "/api/public/me/community/post-images"
          };
        },
        getResponse() {
          return response;
        },
        getNext() {
          return undefined;
        }
      };
    }
  } as unknown as ArgumentsHost;
}

describe("ApiExceptionFilter", () => {
  it("maps body parser payload limit errors to a friendly 413 response", () => {
    const filter = new ApiExceptionFilter();
    const response = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const error = Object.assign(new Error("request entity too large"), {
      type: "entity.too.large",
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      filter.catch(error, httpHost(response));
    } finally {
      consoleError.mockRestore();
    }

    expect(response.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      code: HttpStatus.PAYLOAD_TOO_LARGE,
      message: "上传内容过大，请压缩图片后重试",
      data: null,
      requestId: "req-upload-limit"
    }));
    expect(response.json.mock.calls[0][0]).not.toHaveProperty("path");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
