/**
 *
 */

import { Rectangle } from "./Rectangle";
import { Point, Polygon } from './Polygon';


export interface CanvasConfig {
    /**
     * 多边形的圆点半径
     */
    radius?: number;

    /**
     * 画图开始时触发
     * @param mode  当前图形的形状（rectangle | polygon）
     */
    onStart? (mode: string): any | void;

    /**
     * 画图结束时触发
     * @param currentGeom  当前图形的数据
     * @param geoms  所有图形的数据
     */
    onEnd? (currentGeom: Rectangle | Polygon, geoms: Array<Rectangle | Polygon>): any | void;

    /**
     * 画图过程中触发
     * @param currentGeom  当前图形的数据
     */
    onDrawing? (currentGeom: Rectangle | Polygon): any | void;

    /**
     * 拖动图形的过程中触发
     * @param currentGeom  当前图形的数据
     * @param index  当前图形索引
     */
    onDragging? (currentGeom: Rectangle | Polygon, index: number): any | void;

    /**
     * 改变图形大小的过程中触发
     * @param currentGeom  当前图形的数据
     * @param index  当前图形的索引
     * @param circleIndex  多边形上拖动的某个圆点的索引
     */
    onChangeSize? (currentGeom: Rectangle | Polygon, index: number, circleIndex?: number): any | void;

}
export class Canvas {
    readonly rectangle = 'rectangle';
    readonly polygon = 'polygon';

    $canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    // 所有图形的集合
    geoms: Array<Rectangle | Polygon> = [];
    // 当前正在画的多边形的圆点集合
    private circles: Array<Point> = [];


    private isDraw = false;
    private isDrag = false;

    private startX = -1;
    private startY = -1;
    // private endX = -1;
    // private endY = -1;

    private backgroundColor = 'transparent';
    private selectedBackgroundColor = 'rgba(0, 0, 0, 0.3)';
    private borderColor = 'rgb(0, 0, 0)';




    private canvasConfig?: CanvasConfig;
    radius = 5; // 圆点半径
    onStart? (mode: string): any | void;
    onEnd? (currentGeom: Rectangle | Polygon, geoms: Array<Rectangle | Polygon>): any | void;
    onDrawing? (currentGeom: Rectangle | Polygon): any | void;
    onDragging? (currentGeom: Rectangle | Polygon, index: number): any | void;
    onChangeSize? (currentGeom: Rectangle | Polygon, index: number, circleIndex?: number): any | void;


    constructor (canvas: HTMLCanvasElement, canvasConfig?: CanvasConfig) {
        this.$canvas = canvas;
        this.context = this.$canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!((this.$canvas.parentElement as HTMLElement).style.position)) {
            (this.$canvas.parentElement as HTMLElement).style.position = 'relative';
        }
        if (canvasConfig) {
            this.canvasConfig = canvasConfig;
            this.configAssign(canvasConfig);
        }


        this.$canvas.onmousedown = (e) => {
            this.mousedown(e);
        };

        this.$canvas.onmousemove = (e) => {
            this.mousemove(e);
        };

        this.$canvas.onmouseup = (e) => {
            this.mouseup(e);
        };
    }

    configAssign (canvasConfig: CanvasConfig) {
        if (canvasConfig.radius) {
            this.radius = canvasConfig.radius;
        }

        if (canvasConfig.onStart) {
            this.onStart = canvasConfig.onStart;
        }

        if (canvasConfig.onEnd) {
            this.onEnd = canvasConfig.onEnd;
        }

        if (canvasConfig.onDrawing) {
            this.onDrawing = canvasConfig.onDrawing;
        }

        if (canvasConfig.onDragging) {
            this.onDragging = canvasConfig.onDragging;
        }

        if (canvasConfig.onChangeSize) {
            this.onChangeSize = canvasConfig.onChangeSize;
        }
    }

    // getH (): number {
    //         const result = this.borderColor.match(/\d+/, )
    // }

    draw () {
        this.context.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

        for (let i = 0; i < this.geoms.length; i++) {
            const geom = this.geoms[i];
            const bgColor = geom.selected ? this.selectedBackgroundColor : this.backgroundColor;
            if (geom.shape === this.rectangle) {
                Rectangle.draw(this.context, geom.points, geom.color, bgColor);
            }

            if (geom.shape === this.polygon) {
                Polygon.drawCircle(this.context, geom.points, this.radius);
                Polygon.drawLine(this.context, geom.points, geom.color, bgColor);
            }
        }
    }

    mousedown (e: MouseEvent) {
        this.isDraw = true;
        this.startX = e.offsetX;
        this.startY = e.offsetY;
        if (!this.circles.length) {
            this.borderColor = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
        }



    }

    mousemove (e: MouseEvent) {
        // 画图
        if (this.isDraw && !this.circles.length) {
            if (this.onStart && (this.startX !== e.offsetX || this.startY !== e.offsetY)) {
                this.onStart(this.rectangle);
                this.onStart = undefined;
            }

            this.draw();

            Rectangle.draw(this.context, [
                { x: this.startX, y: this.startY },
                { x: e.offsetX, y: this.startY },
                { x: e.offsetX, y: e.offsetY },
                { x: this.startX, y: e.offsetY }
            ], this.borderColor, this.backgroundColor);

            // this.endX = e.offsetX;
            // this.endY = e.offsetY;
        }

        if (this.circles.length) {
            this.draw();

            Polygon.drawCircle(this.context, this.circles, this.radius);
            Polygon.drawLine(this.context, this.circles.concat([{x: e.offsetX, y: e.offsetY}]), this.borderColor, this.backgroundColor);
        }
    }

    mouseup (e: MouseEvent) {
        if (this.startX !== e.offsetX && this.startY !== e.offsetY) {
            const rectangle = new Rectangle(this.startX, this.startY, e.offsetX, e.offsetY, this.borderColor);
            // const rectangle = new Rectangle(this.startX, this.startY, this.endX, this.endY, this.borderColor);
            this.geoms.push(rectangle);
            this.onEnd && this.onEnd(rectangle, this.geoms);
        }

        if (this.startX === e.offsetX && this.startY === e.offsetY) {
            this.draw();
            if (!this.circles.length) {
                this.circles.push({ x: e.offsetX, y: e.offsetY });
                Polygon.drawCircle(this.context, this.circles, this.radius);
                this.onStart && this.onStart(this.polygon);
            } else {
                const distance = Math.sqrt(Math.pow(this.circles[0].x - e.offsetX, 2) + Math.pow(this.circles[0].y - e.offsetY, 2));

                if (distance < this.radius) {
                    const polygon = new Polygon(JSON.parse(JSON.stringify(this.circles)), this.borderColor);
                    this.geoms.push(polygon);
                    this.circles = [];
                    this.onEnd && this.onEnd(polygon, this.geoms);
                } else {
                    this.circles.push({ x: e.offsetX, y: e.offsetY });
                    Polygon.drawCircle(this.context, this.circles, this.radius);
                }
            }


        }

        this.startX = -1;
        this.startY = -1;
        this.isDraw = false;
        this.isDrag = false;

        if (this.canvasConfig && this.canvasConfig.onStart) {
            this.onStart = this.canvasConfig.onStart;
        }
    }
}
