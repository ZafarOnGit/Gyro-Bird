
//board
let board;
let boardWidth = Math.min(window.innerWidth, window.innerHeight * 0.5625); // 9:16 aspect ratio
let boardHeight = window.innerHeight;
let context;

//bird
let birdWidth = 34; //width/height ratio = 408/228 = 17/12
let birdHeight = 24;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let baseVelocityX = -4; //base pipes moving left speed (increased from -2)
let velocityX = baseVelocityX; //current velocity
let velocityY = 0; //bird jump speed
let gravity = 0.4;
let jumpStrength = -6;

let gameOver = false;
let score = 0;

let lastGyroJump = 0;
let gyroJumpCooldown = 300;
let gyroThreshold = 15;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = function() {
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    requestAnimationFrame(update);
    setInterval(placePipes, 1500); //every 1.5 seconds
    document.addEventListener("keydown", moveBird);
    document.addEventListener("click", moveBird);
    document.addEventListener("touchstart", moveBird);
    window.addEventListener("resize", resizeGame);
    
    initGyroControls();
}

function resizeGame() {
    let newWidth = Math.min(window.innerWidth, window.innerHeight * 0.5625);
    let newHeight = window.innerHeight;
    
    if (boardWidth > 0 && boardHeight > 0) {
        bird.x = (bird.x / boardWidth) * newWidth;
        bird.y = (bird.y / boardHeight) * newHeight;
        birdX = newWidth / 8;
        birdY = newHeight / 2;
    }
    
    boardWidth = newWidth;
    boardHeight = newHeight;
    board.width = boardWidth;
    board.height = boardHeight;
    
    // Update pipe spawn position
    pipeX = boardWidth;
}

function initGyroControls() {
    // Check if DeviceMotionEvent is supported
    if (typeof DeviceMotionEvent === 'undefined') {
        console.log('Device motion not supported');
        return;
    }
    
    // For iOS 13+ devices, request permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // Add a button or trigger to request permission (iOS requirement)
        document.addEventListener('click', function requestPermission() {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('devicemotion', handleMotion);
                        console.log('Gyroscope permission granted');
                    }
                })
                .catch(console.error);
            // Remove listener after first click
            document.removeEventListener('click', requestPermission);
        }, { once: true });
    } else {
        // Non-iOS devices or older iOS versions
        window.addEventListener('devicemotion', handleMotion);
    }
}

function handleMotion(event) {
    if (gameOver) return;
    
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    
    const now = Date.now();
    
    if (now - lastGyroJump < gyroJumpCooldown) return;
    
    const yAccel = Math.abs(acceleration.y);
    const xAccel = Math.abs(acceleration.x);
    const zAccel = Math.abs(acceleration.z);
    
    const totalAccel = Math.sqrt(xAccel * xAccel + yAccel * yAccel + zAccel * zAccel);
    
    // Jump if device is tilted up or shaken
    if (totalAccel > gyroThreshold || yAccel > 12) {
        velocityY = jumpStrength;
        lastGyroJump = now;
        
        if (gameOver) {
            bird.y = birdY;
            pipeArray = [];
            score = 0;
            velocityX = baseVelocityX;
            gameOver = false;
        }
    }
}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    context.clearRect(0, 0, board.width, board.height);

    //bird
    velocityY += gravity;
    // bird.y += velocityY;
    bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) {
        gameOver = true;
    }

    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;
            
            // Gradually increase speed every 5 points (max increase of 2.5x)
            velocityX = baseVelocityX * Math.min(1 + (score * 0.03), 2.5);
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); //removes first element from the array
    }

    //score
    context.fillStyle = "white";
    context.font="45px sans-serif";
    context.fillText(score, 5, 45);

    if (gameOver) {
        context.fillText("GAME OVER", 5, 90);
    }
}

function placePipes() {
    if (gameOver) {
        return;
    }

    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/4;

    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX" || e.type == "click" || e.type == "touchstart") {
        //jump
        velocityY = jumpStrength;
        lastGyroJump = Date.now();
        
        // Prevent default touch behavior (scrolling)
        if (e.type == "touchstart") {
            e.preventDefault();
        }

        //reset game
        if (gameOver) {
            bird.y = birdY;
            pipeArray = [];
            score = 0;
            velocityX = baseVelocityX; //reset speed
            gameOver = false;
        }
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
           a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}