import React, { useEffect, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import { render } from './gl/renderer';
import { Scene } from './gl/scene';
import { Camera } from './gl/camera';
import { Primitive } from './gl/primitive';
import { Circle, Clinder, Cone, Cube, Pane, Sphere } from './gl/shape';
import { Transform } from './gl/transform';
import { Point, Vector } from './gl/geometry';
import { Material, MaterialType } from './gl/material';
import { DirectionalLight, PointLight } from './gl/light';
import { Texture } from './gl/texture';

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
      let deg = 0;
      function testGL() {
        if (!canvasRef.current) return;
        const scene = new Scene();

        const obj2world = Transform.translate(0, 0, -20).multi(Transform.rotateX((deg / 180) * Math.PI));
        deg += 1;

        const material = new Material();
        material.color = [1, 1, 1];
        material.map = new Texture('/wood.jpg')
        material.materialType = MaterialType.COLOR;
        material.interactWithLight = true;

        const cubePrimitive = new Primitive(
          new Cube(
            obj2world,
            obj2world.inverse(),
            5, 5, 5,
          ),
          material 
        );

        // 后面
        const panePrimitive1 = new Primitive(new Pane(
          Transform.translate(0, 0, -20),
          Transform.translate(0, 0, 20),
          10,
          10
        ), material);

        // 左面
        const t = Transform.translate(-5, 0, -15).multi(Transform.rotateY(0.5 * Math.PI));
        const panePrimitive2 = new Primitive(new Pane(
          t,
          t.inverse(),
          10,
          10
        ), { ...material, color: [0, 1, 0] });

        // 右面
        const tt = Transform.translate(5, 0, -15).multi(Transform.rotateY(0.5 * Math.PI))
        const panePrimitive3 = new Primitive(new Pane(
          tt,
          tt.inverse(),
          10,
          10
        ), { ...material, color: [1, 0, 0] });

        // 下面
        const ttt = Transform.translate(0, -5, -15).multi(Transform.rotateX(0.5 * Math.PI))
        const panePrimitive4 = new Primitive(new Pane(
          ttt,
          ttt.inverse(),
          10,
          10
        ), material);

        // 上面
        const tttt = Transform.translate(0, 5, -15).multi(Transform.rotateX(0.5 * Math.PI))
        const panePrimitive5 = new Primitive(new Pane(
          tttt,
          tttt.inverse(),
          10,
          10
        ), material);

        const spherePrimitive = new Primitive(
          new Sphere(
            obj2world,
            obj2world.inverse(),
            4
          ),
          material,
        );

        const conePrimitive = new Primitive(
          new Cone(obj2world, obj2world.inverse(), 5, 10),
          material,
        )

        const clinderPrimitive = new Primitive(
          new Clinder(obj2world, obj2world.inverse(), 5, 10),
          material,
        )

        const circlePrimitive = new Primitive(new Circle(
          obj2world,
          obj2world.inverse(),
          10,
        ), material);

        // scene.primitives.push();
        // scene.primitives.push(u);
        // scene.primitives.push();
        scene.primitives = [
          // cubePrimitive
          panePrimitive1, panePrimitive2, panePrimitive3, panePrimitive4, panePrimitive5,
          spherePrimitive
          // conePrimitive,
          // clinderPrimitive,
          // circlePrimitive
        ]

        scene.ambientLights = [
          // [1, 1, 1],
        ];
        scene.directionalLights = [
          // new DirectionalLight([0, 0, -1], [1, 1, 1]),
          // new DirectionalLight([1, 1, 0], [0.3, 0.1, 0.3]),
        ];
        scene.pointLights = [
          new PointLight([0, 3, -16], [1, 1, 1]),
          // new PointLight([-1, 0, 0], [1, 1, 1]),
        ];

        const camera = new Camera(Math.PI / 2, 1, -5, -1000);
        camera.lookAt(new Point(0, 0, 0), new Point(0, 0, -1), new Vector(0, 1, 0));

        render(canvasRef.current, scene, camera);

        requestAnimationFrame(testGL);
      }

      testGL();
    }

    test3d();
  });

  return (
    <div className="App">
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
      <canvas ref={el => { canvasRef.current = el || undefined; }} width="500px" height="500px" />
    </div>
  );
}

export default App;
