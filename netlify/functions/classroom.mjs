import { getStore } from '@netlify/blobs';
import { makeBackend } from '../backend.mjs';
export default makeBackend(()=>getStore({name:'stress-lab-classrooms',consistency:'strong'}));
export const config={path:['/api/session','/api/session/*']};
