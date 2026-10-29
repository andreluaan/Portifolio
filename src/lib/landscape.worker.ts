import { paintPlane, type PlaneJob } from './landscape';
import type { PlaneRequest, TileMessage } from './planes';

self.onmessage = ({ data }: MessageEvent<PlaneRequest>) => {
  data.jobs.forEach((job: PlaneJob, index) => {
    for (const { x0, width, height, canvas } of paintPlane(job)) {
      const bitmap = (canvas as OffscreenCanvas).transferToImageBitmap();
      const message: TileMessage = { generation: data.generation, job: index, tile: { x0, width, height, bitmap } };
      self.postMessage(message, { transfer: [bitmap] });
    }
    const done: TileMessage = { generation: data.generation, job: index };
    self.postMessage(done);
  });
};
