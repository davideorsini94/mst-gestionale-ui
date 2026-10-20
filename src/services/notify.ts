/**
 * Helper per i toast (`message`) che seguono il tema.
 *
 * Il `message` statico di antd viene renderizzato fuori dal ConfigProvider
 * (quindi ignora tema chiaro/scuro). Questo modulo espone un `message` con la
 * stessa API, inoltrato all'istanza di `App.useApp()` registrata da
 * <NotifyBridge /> (montato dentro <App> di antd). Prima del montaggio usa
 * il `message` statico come ripiego.
 */
import { message as staticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

let current: MessageInstance = staticMessage;

export const setMessageApi = (api: MessageInstance | null): void => {
  current = api ?? staticMessage;
};

type Open = MessageInstance['success'];

export const message: MessageInstance = {
  info: ((...args: Parameters<Open>) => current.info(...args)) as Open,
  success: ((...args: Parameters<Open>) => current.success(...args)) as Open,
  error: ((...args: Parameters<Open>) => current.error(...args)) as Open,
  warning: ((...args: Parameters<Open>) => current.warning(...args)) as Open,
  loading: ((...args: Parameters<Open>) => current.loading(...args)) as Open,
  open: (args) => current.open(args),
  destroy: (key) => current.destroy(key),
};
