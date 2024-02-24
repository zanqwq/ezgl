import React, { useEffect, useRef } from 'react';
import './App.css';
import { render } from './gl/renderer';
import { Scene } from './gl/scene';
import { Camera } from './gl/camera';
import { Primitive } from './gl/primitive';
import { Circle, Clinder, Cone, Cube, Pane, Shape, Sphere } from './gl/shape';
import { Transform } from './gl/transform';
import { Point, Vector } from './gl/geometry';
import { PhongMaterial } from './gl/material';
import { DirectionalLight, PointLight } from './gl/light';
import * as glm from 'gl-matrix';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>();
  useEffect(() => {

    function test2d() {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");

      function testBasicApi() {
        if (!ctx) return;
        ctx.fillStyle = "rgba(200, 125, 110, 0.4)";
        ctx.fillRect(10, 10, 200, 100);
        ctx.clearRect(20, 30, 50, 50);

        ctx.strokeStyle = "green";
        ctx.strokeRect(50, 50, 100, 200);

        ctx.beginPath();
        ctx.strokeStyle = "blue";
        ctx.arc(50, 50, 100, 0, Math.PI * 60 / 180 , false);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.lineTo(250, 300);
        ctx.lineTo(400, 150);
        ctx.closePath();
        ctx.fill();
      }


      let x = 10, y = 10;
      function testTrailerAnim() {
        if (!ctx) return;
        // alpha 越小, trailer 越长
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(0, 0, 500, 500);

        ctx.strokeStyle = "red";
        ctx.beginPath()
        ctx.moveTo(x, y);
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.lineTo(x + 50, y + 50);
        ctx.stroke();
        ctx.closePath();
        x += 5;
        y += 5;

        requestAnimationFrame(testTrailerAnim);
      }

      // testBasicApi();
      testTrailerAnim();
    }

    function test3d() {
      function testGL() {
        if (!canvasRef.current) return;
        const scene = new Scene();

        const sphereShape = new Clinder(Transform.translate(0, 0, -10), Transform.translate(0, 0, -10), 5, 5);
        const sphereMat = new PhongMaterial();
        sphereMat.map.color = [1, 0, 0];
        sphereMat.map.url = '/wood.jpg';
        const spherePrimitive = new Primitive(sphereShape, sphereMat);

        const cubeMat = new PhongMaterial();
        cubeMat.map.url = '/wood.jpg';
        const cubeTransform = Transform.translate(0, -20, -80);
        const cubeShape = new Cube(cubeTransform, cubeTransform.inverse(), 20, 20, 20);
        const cubePrimitive = new Primitive(cubeShape, cubeMat);

        const btmPaneTransform = Transform.translate(0, -50, -80)
        const paneMat = new PhongMaterial();
        paneMat.map.url = '/wood.jpg';
        const paneShape = new Pane(btmPaneTransform, btmPaneTransform.inverse(), 80, 40);
        const bottomPanePrimitive = new Primitive(paneShape, paneMat);

        scene.primitives = [
          // spherePrimitive
          cubePrimitive,
          bottomPanePrimitive,
        ];

        scene.ambientLights = [
          // [1, 0, 0]
        ];
        scene.directionalLights = [
          new DirectionalLight([0, 100, 0], [0, -1, 0], [0, 0, -1], [1, 1, 1]),
        ];
        scene.pointLights = [
          // new PointLight([0, 10, -10], [1, 1, 1]),
          // new PointLight([-1, 0, 0], [1, 1, 1]),
        ];

        const camera = new Camera(90 * Math.PI / 180, 1, -1, -1000);
        const camPos = new Point(0, 0, 0);
        const camTar = new Point(0, 0, -1);
        const camUp = new Vector(0, 1, 0);
        camera.lookAt(camPos, camTar, camUp);
        // camera.lookAt(new Point(0, 0, 0), new Point(0, 0, -1), new Vector(0, 1, 0));

        canvasRef.current.addEventListener('click', async e => {
          await canvasRef.current?.requestPointerLock();
          // 绕 CamUp 旋转
          let mx = 0;
          // 绕 CrossDir 旋转
          let my = 0;
          window?.addEventListener('mousemove', e => {
            let { pos, tar, up } = camera;
            let look = tar.sub(pos).normalized();
            mx = e.movementX;
            const rotateAroundUp = Transform
              .rotate(up.normalized(), (mx > 0 ? -1 : 1) * 2 * Math.PI / 180);
            look = rotateAroundUp.transformVector(look).normalized();
            tar = new Point(pos.x + look.x, pos.y + look.y, pos.z + look.z);

            look = tar.sub(pos).normalized();
            const cross = look.cross(up).normalized();
            my = e.movementY;
            const rotateAroundCross = Transform
              .rotate(cross, (my > 0 ? -1 : 1) * Math.PI / 180);
            up = rotateAroundCross.transformVector(up, true).normalized();
            look = rotateAroundCross.transformVector(look).normalized();
            tar = new Point(pos.x + look.x, pos.y + look.y, pos.z + look.z);

            camera.lookAt(pos, tar, up);
          });
        });

        function main() {
          if (!canvasRef.current) return;
          render(canvasRef.current, scene, camera);
          requestAnimationFrame(main);
        }
        main();
      }

      testGL();
    }

    test3d();
  });


  return (
    <div className="App" style={{width: '100vw', height: '100vh'}}>
      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header> */}
      <canvas
        id='cv'
        ref={el => { canvasRef.current = el || undefined; }}
        width="500px"
        height="500px"
      />
    </div>
  );
}

export default App;
