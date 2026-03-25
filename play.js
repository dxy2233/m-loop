import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import PlaySound from 'play-sound';
import schedule from 'node-schedule';

const player = PlaySound({});

// Replicate __dirname functionality in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.join(__dirname, 'assets');

let isPlaybackActive = false; // Global state to control the playback loop

/**
 * Finds all audio files in a given directory.
 * @param {string} dirPath - The path to the directory.
 * @returns {Promise<string[]>} An array of full paths to the audio files.
 */
async function findAllAudioFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const audioFiles = files
      .filter(file => 
        ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.aiff'].some(ext => file.toLowerCase().endsWith(ext))
      )
      .map(file => path.join(dirPath, file));
    return audioFiles;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Assets directory not found at '${dirPath}'`);
    } else {
      console.error(`Error reading assets directory:`, error);
    }
    return [];
  }
}

/**
 * Plays an audio file using a Promise-based wrapper around player.play.
 * @param {string} file - The path to the audio file.
 * @returns {Promise<void>} A promise that resolves when playback is finished, or rejects on error.
 */
function playAudio(file) {
  return new Promise((resolve, reject) => {
    player.play(file, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

/**
 * Continuously plays a playlist of audio files as long as isPlaybackActive is true.
 * @param {string[]} playlist - An array of audio file paths.
 */
async function loopPlaylist(playlist) {
  console.log('Playback loop started.');
  while (isPlaybackActive) {
    for (const audioFile of playlist) {
      if (!isPlaybackActive) break; // Check the flag before starting a new song
      try {
        console.log(`Now playing: ${path.basename(audioFile)}...`);
        await playAudio(audioFile);
      } catch (err) {
        console.error(`Could not play audio file ${path.basename(audioFile)}:`, err);
      }
    }
    if (isPlaybackActive) {
      console.log('Playlist finished. Restarting...');
    }
  }
  console.log('Playback loop has stopped.');
}

/**
 * Main function to find files and schedule the playback.
 */
async function main() {
  const playlist = await findAllAudioFiles(assetsDir);

  if (playlist.length === 0) {
    console.error('No suitable audio files found in the assets directory. The script will not run.');
    process.exit(1);
  }

  // Define the start time using a cron-like pattern.
  const startTime = '40 11 * * *';
  console.log(`Script initialized. Waiting to start playback every day at 11:40.`);

  schedule.scheduleJob(startTime, () => {
    if (isPlaybackActive) {
      console.log('Playback is already active. Ignoring scheduled start.');
      return;
    }

    console.log('Scheduled time (11:40) reached. Starting playback for 5 minutes.');
    isPlaybackActive = true;
    
    // Start the playback loop. This runs in the background and doesn't block.
    loopPlaylist(playlist);

    // Schedule the stop action 5 minutes from now.
    const fiveMinutes = 5 * 60 * 1000;
    setTimeout(() => {
      console.log('5 minutes have passed. Deactivating playback after current song finishes.');
      isPlaybackActive = false;
    }, fiveMinutes);
  });
}

main();
