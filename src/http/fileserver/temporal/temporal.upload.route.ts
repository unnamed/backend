import {Router} from 'express';
import crypto from 'crypto';
import {formatBytes} from '../../../util/format';

export default (
  router: Router,
  moduleConfig: NodeJS.Dict<any>,
  fileMap: Map<string, any>
) => {
  const ipIdMap = new Map<string, string>();
  router.post(
    '/upload',
    (req, res) => {

      // The request IP
      const ip = req.ip;

      // function to set status code and error
      function fail(code: number, error: string) {
        res.status(code).json({
          ok: false,
          code,
          error
        });
      }

      // look for uploaded files
      const files = req['files'];

      if (!files) {
        return fail(400, 'No files specified');
      }

      const file = files['file'];

      if (!file) {
        return fail(400, 'No "file" file specified');
      }

      if (file.size > moduleConfig.limits.size) {
        return fail(413, `File is too large, limit is ${formatBytes(moduleConfig.limits.size)}`);
      }

      let id = ipIdMap.get(ip);
      if (id === undefined) {
        id = Date.now().toString(36);
        ipIdMap.set(ip, id);
      }

      fileMap.set(id, file.data);
      setTimeout(() => {
        fileMap.delete(id);
        ipIdMap.delete(ip);
      }, moduleConfig.lifetime);

      // compute file hash
      const hashSum = crypto.createHash('sha1');
      hashSum.update(file.data);
      const hash = hashSum.digest('hex');
      const downloadUrl = `https://artemis.unnamed.team${moduleConfig.route}/get/${id}`;

      // finally set the response
      res.status(200).json({
        status: 'ok',
        url: downloadUrl,
        id,
        hash
      });
    });
};