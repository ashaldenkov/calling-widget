export type MicPermissionState = 'granted' | 'denied' | 'noDevice' | 'failed';

const classify = (err: unknown): MicPermissionState => {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'denied';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'noDevice';
    }
  }
  return 'failed';
};

export const probeMicPermission = async (): Promise<MicPermissionState> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch (err) {
    return classify(err);
  }
};
