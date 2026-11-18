let idleSprite; // 儲存角色靜止狀態的精靈圖
let runSprite; // 儲存角色跑步狀態的精靈圖
let sceneImage; // 儲存可左右平移的背景圖片
let seamlessScene; // 儲存左右邊緣融合後的背景平鋪圖片
let thunderSprite; // 儲存由上而下的閃電精靈圖
let boomSprite; // 儲存位於畫面底部的爆炸精靈圖
let thunderSound; // 儲存右端閃電循環播放的雷聲音效
let direction = 0; // 記錄移動方向，1代表向右，-1代表向左，0代表暫停
let idleFrame = 0; // 記錄靜止動畫目前播放的影格
let runFrame = 0; // 記錄跑步動畫目前播放的影格
let runBottomPadding = []; // 記錄跑步精靈各影格底部的透明留白
let backgroundOffset = 0; // 記錄有限背景帶的水平位移
let characterX = 0; // 記錄角色中心點的水平位置
let rightEffectPhase = "inactive"; // 記錄右端特效目前播放階段
let rightThunderCount = 0; // 記錄右端閃電已播放次數
let rightEffectStartedAt = 0; // 記錄目前特效階段的開始時間
let lastFrameTime = 0; // 記錄上一次切換動畫影格的時間
const idleFrameInterval = 100; // 設定靜止動畫每隔100毫秒切換影格
const runFrameInterval = 70; // 設定跑步動畫每隔70毫秒切換影格以加快動作
const backgroundSpeed = 8; // 設定背景每畫格平移8像素以加快場景移動
const characterSpeed = 4; // 設定背景到端點後角色每畫格移動的像素數
function preload() { // 在畫面建立前載入動畫與背景圖片
  idleSprite = loadImage("character/stop/stop.png"); // 載入角色靜止精靈圖
  runSprite = loadImage("character/run/run.png"); // 載入角色跑步精靈圖
  sceneImage = loadImage("background/1.png"); // 載入背景場景圖片
  thunderSprite = loadImage("effect/thunder/thunder.png"); // 載入閃電特效精靈圖
  boomSprite = loadImage("effect/boom/boom.png"); // 載入爆炸特效精靈圖
  thunderSound = loadSound("audio/chrysalyn-clean-dramatic-lightning-crash-547378.mp3"); // 載入雷聲音效
} // 結束圖片載入函式
function setup() { // 初始化畫布與動畫播放時間
  createCanvas(windowWidth, windowHeight); // 建立符合瀏覽器視窗寬高的畫布
  imageMode(CORNER); // 使用圖片左上角作為繪製座標
  seamlessScene = createSeamlessBackground(); // 預先融合背景左右邊緣以消除接縫
  runBottomPadding = getSpriteBottomPadding(runSprite, 6); // 計算跑步精靈每格透明底邊高度
  const backgroundScale = Math.max(height / seamlessScene.height, width / (seamlessScene.width * 3)); // 計算背景縮放比例
  backgroundOffset = seamlessScene.width * backgroundScale / 2; // 將初始接縫移出視窗範圍
  characterX = width / 2; // 將角色初始位置設在畫布中央
  frameRate(60); // 設定畫面更新頻率為每秒60格
  lastFrameTime = millis(); // 記錄動畫開始播放的時間
} // 結束初始化函式
function draw() { // 每一畫格繪製背景、更新動畫並繪製角色
  updateMovement(); // 移動背景並在抵達端點時停止
  updateRightEndEffects(); // 背景停在最右端時更新閃電與爆炸循環
  drawBackground(); // 繪製原圖及左右各一張背景副本
  updateAnimation(); // 依照播放狀態更新動畫影格
  drawCharacter(); // 將角色固定繪製在視窗中央
  drawRightEndEffects(); // 在背景最右端繪製閃電或爆炸特效
} // 結束畫面繪製函式
function createSeamlessBackground() { // 建立左右邊緣自然融合的背景圖片
  const sourceHeight = sceneImage.height - 12; // 裁掉背景素材底部的黑白邊線
  const seamWidth = Math.floor(sceneImage.width * 0.04); // 設定左右邊緣融合寬度為素材寬度的百分之四
  const tileWidth = sceneImage.width - seamWidth; // 融合左右邊緣後的背景平鋪寬度
  const backgroundTile = createGraphics(tileWidth, sourceHeight); // 建立融合後背景的離屏畫布
  const leftEdge = createGraphics(seamWidth, sourceHeight); // 建立暫存左側漸層邊緣的離屏畫布
  backgroundTile.image(sceneImage, seamWidth, 0, sceneImage.width - seamWidth * 2, sourceHeight, seamWidth, 0, sceneImage.width - seamWidth * 2, sourceHeight); // 保留背景中央內容並向內縮放接縫位置
  backgroundTile.image(sceneImage, 0, 0, seamWidth, sourceHeight, sceneImage.width - seamWidth, 0, seamWidth, sourceHeight); // 將背景右側邊緣放到融合區作為底圖
  leftEdge.image(sceneImage, 0, 0, seamWidth, sourceHeight, 0, 0, seamWidth, sourceHeight); // 將背景左側邊緣放到漸層融合圖層
  const edgeContext = leftEdge.drawingContext; // 取得漸層圖層的畫布繪圖環境
  edgeContext.globalCompositeOperation = "destination-in"; // 以漸層透明度遮罩左側邊緣
  const edgeGradient = edgeContext.createLinearGradient(0, 0, seamWidth, 0); // 建立由透明到不透明的水平漸層
  edgeGradient.addColorStop(0, "rgba(0, 0, 0, 0)"); // 漸層左端維持透明
  edgeGradient.addColorStop(1, "rgba(0, 0, 0, 1)"); // 漸層右端完全顯示左側背景
  edgeContext.fillStyle = edgeGradient; // 將水平漸層指定為遮罩顏色
  edgeContext.fillRect(0, 0, seamWidth, sourceHeight); // 將漸層遮罩套用到左側邊緣
  backgroundTile.image(leftEdge, 0, 0); // 將漸層左邊緣疊合到右邊緣底圖
  leftEdge.remove(); // 釋放暫存漸層圖層
  return backgroundTile; // 回傳可自然銜接的背景圖片
} // 結束背景接縫融合函式
function getBackgroundScale() { // 計算符合視窗尺寸且可由三張圖片覆蓋的縮放比例
  return Math.max(height / seamlessScene.height, width / (seamlessScene.width * 3)); // 依畫布高度或總背景寬度選擇較大的比例
} // 結束背景縮放比例函式
function updateMovement() { // 移動背景並在有限背景帶的端點停止
  if (direction === 0) { // 沒有方向鍵按住時
    return; // 保持目前背景位置
  } // 結束移動狀態檢查
  const centerX = width / 2; // 計算畫面水平中央位置
  if ((direction > 0 && characterX < centerX) || (direction < 0 && characterX > centerX)) { // 反向移動且角色尚未回到畫面中央時
    moveCharacterToCenter(); // 先讓角色跑回畫面中央
    return; // 角色回到中央後再開始捲動背景
  } // 結束角色回中央判斷
  const tileWidth = seamlessScene.width * getBackgroundScale(); // 計算目前畫布下單張背景的顯示寬度
  const rightLimit = tileWidth * 2 - width; // 計算背景最右端碰到視窗右側時的位移
  const leftLimit = -tileWidth; // 計算背景最左端碰到視窗左側時的位移
  if (direction > 0 && backgroundOffset < rightLimit) { // 背景右端尚未抵達視窗右側時
    backgroundOffset = Math.min(backgroundOffset + backgroundSpeed, rightLimit); // 將背景向左移至右側邊界
  } else if (direction < 0 && backgroundOffset > leftLimit) { // 背景左端尚未抵達視窗左側時
    backgroundOffset = Math.max(backgroundOffset - backgroundSpeed, leftLimit); // 將背景向右移至左側邊界
  } else { // 背景已抵達該方向的視窗邊界時
    moveCharacter(); // 背景停止後改由角色朝目前方向移動
  } // 結束背景或角色移動判斷
} // 結束移動更新函式
function moveCharacter() { // 背景抵達端點後移動角色至視窗邊緣
  const frameWidth = runSprite.width / 6; // 計算跑步精靈圖單格寬度
  const frameScale = height / 3 / runSprite.height; // 依畫布高度三分之一計算跑步角色縮放比例
  const halfCharacterWidth = frameWidth * frameScale / 2; // 計算角色半寬以判斷視窗邊界
  characterX += direction * characterSpeed; // 依方向移動角色水平位置
  if (direction > 0 && characterX + halfCharacterWidth >= width) { // 角色右側碰到視窗右邊時
    characterX = width - halfCharacterWidth; // 將角色停在視窗右邊界
    direction = 0; // 停止移動並切回靜止動畫
  } else if (direction < 0 && characterX - halfCharacterWidth <= 0) { // 角色左側碰到視窗左邊時
    characterX = halfCharacterWidth; // 將角色停在視窗左邊界
    direction = 0; // 停止移動並切回靜止動畫
  } // 結束角色邊界判斷
  if (direction === 0) { // 角色抵達視窗邊緣時
    lastFrameTime = millis(); // 重設影格時間以銜接靜止動畫
  } // 結束角色停止處理
} // 結束角色移動函式
function moveCharacterToCenter() { // 將角色往畫面中央移動
  const centerX = width / 2; // 計算畫面水平中央位置
  if (characterX < centerX) { // 角色位於畫面中央左側時
    characterX = Math.min(characterX + characterSpeed, centerX); // 逐步往右移回中央
  } else { // 角色位於畫面中央右側時
    characterX = Math.max(characterX - characterSpeed, centerX); // 逐步往左移回中央
  } // 結束角色回中央方向判斷
} // 結束角色回中央函式
function isRightBackgroundStopped() { // 判斷背景是否靜止在最右端
  const rightLimit = seamlessScene.width * getBackgroundScale() * 2 - width; // 計算背景最右端抵達視窗右側的位移
  return backgroundOffset >= rightLimit; // 背景抵達最右端後即啟用特效
} // 結束右端背景狀態判斷函式
function updateRightEndEffects() { // 在背景最右端循環播放閃電與爆炸
  if (!isRightBackgroundStopped()) { // 背景開始移動或離開最右端時
    if (thunderSound.isPlaying()) { // 雷聲正在播放時
      thunderSound.stop(); // 立即停止雷聲
    } // 結束雷聲停止判斷
    rightEffectPhase = "inactive"; // 關閉右端特效
    rightThunderCount = 0; // 清除閃電播放次數
    return; // 等待背景再次停在最右端
  } // 結束右端停留狀態檢查
  const currentTime = millis(); // 取得目前時間以計算特效播放進度
  if (rightEffectPhase === "inactive") { // 初次停在背景最右端時
    rightEffectPhase = "thunder"; // 開始播放閃電
    rightThunderCount = 1; // 設定目前為第一道閃電
    rightEffectStartedAt = currentTime; // 記錄閃電播放開始時間
    if (thunderSound.isLoaded() && !thunderSound.isPlaying()) { // 雷聲已載入且尚未播放時
      thunderSound.loop(); // 循環播放雷聲直到背景離開最右端
    } // 結束雷聲啟動判斷
    return; // 保留第一道閃電的完整一秒播放時間
  } // 結束右端特效啟動判斷
  while (currentTime - rightEffectStartedAt >= 1000) { // 每個特效階段播放滿一秒後切換
    rightEffectStartedAt += 1000; // 將階段開始時間推進一秒
    if (rightEffectPhase === "thunder" && rightThunderCount < 3) { // 前兩次閃電播完時
      rightThunderCount++; // 播放下一次閃電
    } else if (rightEffectPhase === "thunder") { // 第三次閃電播完時
      rightEffectPhase = "boom"; // 接續播放底部爆炸
    } else { // 爆炸播放完一秒時
      rightEffectPhase = "thunder"; // 從第一道閃電重新開始循環
      rightThunderCount = 1; // 重設閃電播放次數
    } // 結束特效階段切換判斷
  } // 結束特效時間更新迴圈
} // 結束右端特效更新函式
function drawRightEndEffects() { // 在視窗右側四分之一處繪製右端特效
  if (!isRightBackgroundStopped() || rightEffectPhase === "inactive") { // 背景離開右端或特效尚未啟動時
    return; // 不繪製特效
  } // 結束特效繪製狀態檢查
  const effectCenterX = width * 0.75; // 將特效中心放在距視窗右側四分之一處
  const elapsed = millis() - rightEffectStartedAt; // 計算目前特效階段已播放時間
  push(); // 暫存畫布狀態以免影響角色與背景
  if (rightEffectPhase === "thunder") { // 閃電階段由畫面頂端向下播放
    const frameWidth = thunderSprite.width / 14; // 計算閃電精靈圖單格寬度
    const frameHeight = thunderSprite.height; // 取得閃電精靈圖單格高度
    const frameIndex = Math.min(13, Math.floor(elapsed / 1000 * 14)); // 依一秒播放速度選取十四格中的影格
    const frameScale = Math.min(height / frameHeight, width * 0.5 / frameWidth); // 縮放閃電使其適合畫布尺寸
    const drawWidth = frameWidth * frameScale; // 計算閃電顯示寬度
    const drawHeight = frameHeight * frameScale; // 計算閃電顯示高度
    image(thunderSprite, effectCenterX - drawWidth / 2, 0, drawWidth, drawHeight, frameIndex * frameWidth, 0, frameWidth, frameHeight); // 從精靈圖擷取並繪製目前閃電影格
  } else { // 第三次閃電後在畫面底部播放爆炸
    const frameWidth = boomSprite.width / 10; // 計算爆炸精靈圖單格寬度
    const frameHeight = boomSprite.height; // 取得爆炸精靈圖單格高度
    const frameIndex = Math.min(9, Math.floor(elapsed / 1000 * 10)); // 依一秒播放速度選取十格中的影格
    const frameScale = Math.min(height * 0.32 / frameHeight, width * 0.5 / frameWidth); // 保持比例並限制爆炸不超出視窗
    const drawWidth = frameWidth * frameScale; // 計算爆炸顯示寬度
    const drawHeight = frameHeight * frameScale; // 計算爆炸顯示高度
    image(boomSprite, effectCenterX - drawWidth / 2, height - drawHeight, drawWidth, drawHeight, frameIndex * frameWidth, 0, frameWidth, frameHeight); // 將爆炸影格繪製在視窗底部
  } // 結束閃電或爆炸繪製判斷
  pop(); // 還原畫布狀態
} // 結束右端特效繪製函式
function drawBackground() { // 繪製中間背景及左右各一張背景副本
  const scaleFactor = getBackgroundScale(); // 依視窗尺寸計算背景縮放比例
  const tileWidth = seamlessScene.width * scaleFactor; // 計算單張背景顯示寬度
  const tileHeight = seamlessScene.height * scaleFactor; // 依比例計算單張背景顯示高度
  const tileY = (height - tileHeight) / 2; // 將背景置中以裁切過高的畫面
  for (let tileIndex = -1; tileIndex <= 1; tileIndex++) { // 只繪製左側、中間及右側三張背景
    const tileX = tileIndex * tileWidth - backgroundOffset; // 計算目前背景的水平位置
    image(seamlessScene, tileX, tileY, tileWidth + 1, tileHeight); // 略微重疊相鄰背景以避免縮放細縫
  } // 結束三張背景繪製迴圈
} // 結束背景繪製函式
function updateAnimation() { // 按固定時間間隔推進目前的精靈動畫
  const currentTime = millis(); // 取得目前經過的毫秒數
  const currentInterval = direction === 0 ? idleFrameInterval : runFrameInterval; // 依靜止或跑步狀態選擇影格間隔
  if (currentTime - lastFrameTime < currentInterval) { // 尚未到達切換影格的時間時
    return; // 保留目前影格並等待下一次畫面更新
  } // 結束影格時間檢查
  lastFrameTime = currentTime; // 更新上一次切換影格的時間
  if (direction === 0) { // 角色暫停移動時播放靜止動畫
    idleFrame = (idleFrame + 1) % 6; // 依序循環播放靜止圖的六個影格
  } else if (runFrame === 0) { // 開始跑步時先顯示跑步圖的第一個影格一次
    runFrame = 1; // 下一格開始播放跑步圖的第二個影格
  } else { // 跑步動畫進行中時
    runFrame = runFrame >= 5 ? 1 : runFrame + 1; // 循環播放第二到第六個跑步影格
  } // 結束動畫影格更新判斷
} // 結束動畫更新函式
function drawCharacter() { // 將角色影格固定在畫布中央並依方向翻轉
  const sprite = direction === 0 ? idleSprite : runSprite; // 依移動狀態選擇靜止圖或跑步圖
  const frameIndex = direction === 0 ? idleFrame : runFrame; // 依移動狀態選擇目前播放的影格
  const frameWidth = sprite.width / 6; // 將精靈圖總寬平均分成六個影格
  const frameHeight = sprite.height; // 使用精靈圖的完整高度作為單格高度
  const drawScale = height / 3 / frameHeight; // 將角色影格高度縮放為畫布高度的三分之一
  const drawX = -frameWidth * drawScale / 2; // 將角色水平置中於畫布座標原點
  const bottomPadding = direction === 0 ? 0 : runBottomPadding[frameIndex]; // 讀取跑步影格底部透明留白
  const drawY = height - (frameHeight - bottomPadding) * drawScale; // 補償透明留白使角色可見腳底貼齊畫布底部
  push(); // 暫存畫布座標與縮放狀態
  translate(characterX, 0); // 將繪圖原點移至角色目前的水平位置
  if (direction < 0) { // 向左移動時需要將角色水平翻轉
    scale(-1, 1); // 沿水平軸翻轉角色精靈圖
  } // 結束角色翻轉判斷
  image(sprite, drawX, drawY, frameWidth * drawScale, frameHeight * drawScale, frameIndex * frameWidth, 0, frameWidth, frameHeight); // 依p5參數順序擷取目前影格並繪製縮放後的角色
  pop(); // 還原畫布座標與縮放狀態
} // 結束角色繪製函式
function keyPressed() { // 依鍵盤輸入切換方向或暫停移動
  if (keyCode === RIGHT_ARROW) { // 按下向右鍵時
    userStartAudio(); // 透過使用者按鍵啟用瀏覽器音訊播放
    const halfCharacterWidth = (runSprite.width / 6) * (height / 3 / runSprite.height) / 2; // 計算跑步角色半寬
    const rightLimit = seamlessScene.width * getBackgroundScale() * 2 - width; // 計算背景最右端抵達視窗右側的位移
    if (characterX >= width - halfCharacterWidth && backgroundOffset >= rightLimit) { // 角色與背景都在最右端時
      return false; // 保持暫停狀態
    } // 結束右側邊界檢查
    if (direction !== 1) { // 只有方向改變時才重新開始跑步動畫
      direction = 1; // 設定角色朝右並讓背景向左移動
      runFrame = 0; // 從跑步精靈圖第一個影格開始
      lastFrameTime = millis(); // 重設影格時間以完整顯示第一格
    } // 結束向右方向更新
    return false; // 避免瀏覽器因方向鍵捲動頁面
  } // 結束向右鍵判斷
  if (keyCode === LEFT_ARROW) { // 按下向左鍵時
    userStartAudio(); // 透過使用者按鍵啟用瀏覽器音訊播放
    const halfCharacterWidth = (runSprite.width / 6) * (height / 3 / runSprite.height) / 2; // 計算跑步角色半寬
    const leftLimit = -seamlessScene.width * getBackgroundScale(); // 計算背景最左端抵達視窗左側的位移
    if (characterX <= halfCharacterWidth && backgroundOffset <= leftLimit) { // 角色與背景都在最左端時
      return false; // 保持暫停狀態
    } // 結束左側邊界檢查
    if (direction !== -1) { // 只有方向改變時才重新開始跑步動畫
      direction = -1; // 設定角色朝左並讓背景向右移動
      runFrame = 0; // 從跑步精靈圖第一個影格開始
      lastFrameTime = millis(); // 重設影格時間以完整顯示第一格
    } // 結束向左方向更新
    return false; // 避免瀏覽器因方向鍵捲動頁面
  } // 結束向左鍵判斷
  if (key === " ") { // 按下空白鍵時
    direction = 0; // 暫停背景移動並切回靜止動畫
    lastFrameTime = millis(); // 重設影格時間以銜接靜止動畫
    return false; // 避免空白鍵捲動頁面
  } // 結束空白鍵判斷
} // 結束鍵盤輸入函式
function keyReleased() { // 放開方向鍵時停止移動並回到靜止畫面
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) { // 只處理左右方向鍵放開事件
    let nextDirection = 0; // 預設左右鍵都放開時回到暫停狀態
    if (keyIsDown(RIGHT_ARROW)) { // 若放開按鍵後仍按住向右鍵
      nextDirection = 1; // 繼續向右移動
    } else if (keyIsDown(LEFT_ARROW)) { // 若仍按住向左鍵
      nextDirection = -1; // 繼續向左移動
    } // 結束其他方向鍵狀態判斷
    if (nextDirection !== 0 && nextDirection !== direction) { // 持續移動但方向改變時
      runFrame = 0; // 從跑步精靈圖第一個影格開始
    } // 結束方向改變影格重設
    direction = nextDirection; // 更新方向，無方向鍵按住時背景即停止
    lastFrameTime = millis(); // 重設影格時間以銜接下一段動畫
    return false; // 避免瀏覽器因方向鍵捲動頁面
  } // 結束方向鍵放開判斷
} // 結束鍵盤放開函式
function windowResized() { // 視窗尺寸改變時同步調整畫布寬度
  resizeCanvas(windowWidth, windowHeight); // 視窗大小改變時同步調整畫布寬高
  const backgroundScale = Math.max(height / seamlessScene.height, width / (seamlessScene.width * 3)); // 依新畫布尺寸計算背景縮放比例
  backgroundOffset = seamlessScene.width * backgroundScale / 2; // 將背景接縫保持在視窗外
  characterX = width / 2; // 視窗尺寸改變時將角色重新置中
} // 結束視窗尺寸調整函式
function getSpriteBottomPadding(sprite, frameCount) { // 計算精靈圖各格最底端的透明像素列數
  const frameWidth = sprite.width / frameCount; // 計算每格精靈圖寬度
  const spriteContext = sprite.canvas.getContext("2d"); // 取得精靈圖像素資料
  return Array.from({length: frameCount}, (_, frameIndex) => { // 逐格計算底部透明留白
    const sourceX = Math.floor(frameIndex * frameWidth); // 計算目前影格來源區域左側座標
    const sourceRight = Math.ceil((frameIndex + 1) * frameWidth); // 計算目前影格來源區域右側座標
    const sourceWidth = sourceRight - sourceX; // 計算目前影格來源區域實際寬度
    const pixels = spriteContext.getImageData(sourceX, 0, sourceWidth, sprite.height).data; // 讀取目前影格的像素透明度
    let bottomRow = sprite.height - 1; // 從精靈圖最底列開始檢查
    while (bottomRow >= 0) { // 持續往上搜尋不透明像素
      let hasOpaquePixel = false; // 記錄目前列是否包含可見像素
      for (let x = 0; x < sourceWidth; x++) { // 檢查目前列的每個像素
        if (pixels[(bottomRow * sourceWidth + x) * 4 + 3] > 0) { // 找到非透明像素時
          hasOpaquePixel = true; // 標記目前列含有可見內容
          break; // 結束目前列的像素搜尋
        } // 結束像素透明度判斷
      } // 結束目前列像素檢查
      if (hasOpaquePixel) { // 找到角色腳底可見像素時
        break; // 結束底部留白搜尋
      } // 結束可見像素列判斷
      bottomRow--; // 往上一列繼續搜尋
    } // 結束底部透明列搜尋
    return sprite.height - 1 - bottomRow; // 回傳目前影格底部透明列數
  }); // 結束所有影格的留白計算
} // 結束精靈圖底部留白計算函式
