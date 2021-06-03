/**
 * 使用说明
 *
 * const myCanvas = new Canvas($canvas, {
 *     onStart: (mode) => {},
 *     onEnd: (currentGeom, geoms) => {},
 *     ...
 * });
 *
 *  参数1
 *      $canvas: <canvas>元素
 *  参数2
 *      自定义配置项（详情见下方的 CanvasConfig 接口）：{
 *          onStart：回调函数，画图开始时触发
 *          onEnd：回调函数，画图结束时触发
 *          onDrawing：回调函数，画图过程中触发
 *          onDragging：回调函数，拖动过程中触发
 *          onChangeSize：回调函数，改变大小过程中触发
 *          onClick：回调函数，点击图形时触发
 *      }
 *
 * myCanvas.$canvas: <canvas>元素
 * myCanvas.context: getContext("2d") 对象
 * myCanvas.geoms: 所有图形数据
 * myCanvas.draw(): 画所有图形
 * myCanvas.clear(): 清空当前画布，重置数据
 * myCanvas.delete(index): 删除单个图形
 * myCanvas.setSelected(index): 设置默认选中
 * myCanvas.getSelectedIndex(): 获取选中图形的索引
 *
 */

import { Rect, Rectangle } from "./Rectangle";
import { Point, Polygon } from './Polygon';


// 单个图形可能具有的类型
type Geom = Rectangle | Polygon;

export interface CanvasConfig {
    /**
     * 多边形的圆点半径
     */
    radius?: number;

    /**
     * 画图开始时触发
     * @param mode  当前图形的形状（Geom）
     */
    onStart? (mode: string): any | void;

    /**
     * 画图结束时触发
     * @param currentGeom  当前图形的数据
     * @param geoms  所有图形的数据
     */
    onEnd? (currentGeom: Geom, geoms: Array<Geom>): any | void;

    /**
     * 画图过程中触发
     * @param currentGeom  当前图形的数据
     */
    onDrawing? (): any | void;

    /**
     * 拖动图形的过程中触发
     * @param currentGeom  当前图形的数据
     * @param index  当前图形索引
     */
    onDragging? (currentGeom: Geom, index: number): any | void;

    /**
     * 改变图形大小的过程中触发
     * @param currentGeom  当前图形的数据
     * @param index  当前图形的索引
     * @param circleIndex  多边形上拖动的某个圆点的索引
     */
    onChangeSize? (currentGeom: Geom, index: number, circleIndex?: number): any | void;

    onClick? (currentGeom: Geom, index: number): any | void;
}




export class Canvas {
    readonly rectangle = 'rectangle';
    readonly polygon = 'polygon';

    $canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;


    geoms: Array<Geom> = []; // 所有图形的集合
    private circles: Array<Point> = []; // 当前正在画的多边形的圆点集合

    private isDraw = false;
    private isDrag = false;

    private startX = -1;
    private startY = -1;

    private index = -1; // 当前要处理的图形的索引，比如：拖动/改变大小。和 Rectangle|Polyogn 中的 selected 属性不一样，selected 只是判断当前图形是否选中状态。当前 index 对应的图形，selected 不一定是 true。
    private circleIndex = -1; // 当前圆点的索引（改变多边形大小时用到）

    private isRectChange = false; // 矩形大小改变开关
    private placement = ''; // 判断鼠标是在矩形的哪一边（right-top|right|right-bottom|bottom|left-bottom|left|left-top|top）
    private oldRect: Rect = {x: -1, y: -1, width: -1, height: -1}; // 记录改变矩形大小前的原始数据

    private backgroundColor = 'transparent'; // 背景颜色，默认透明无色
    private selectedBackgroundColor = 'rgba(0, 0, 0, 0.3)'; // 选中时的背景颜色
    private borderColor = ''; // 边框颜色

    private canvasConfig?: CanvasConfig;
    radius = 5; // 圆点半径
    onStart? (mode: string): any | void;
    onEnd? (currentGeom: Geom, geoms: Array<Geom>): any | void;
    onDrawing? (): any | void;
    onDragging? (currentGeom: Geom, index: number): any | void;
    onChangeSize? (currentGeom: Geom, index: number, circleIndex?: number): any | void;
    onClick? (currentGeom: Geom, index: number): any | void;


    constructor (canvas: HTMLCanvasElement, canvasConfig?: CanvasConfig) {
        this.$canvas = canvas;
        this.context = this.$canvas.getContext('2d') as CanvasRenderingContext2D;
        // if (!((this.$canvas.parentElement as HTMLElement).style.position)) {
        //     (this.$canvas.parentElement as HTMLElement).style.position = 'relative';
        // }
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

    /**
     * 清除画布和所有数据
     */
    clear () {
        this.context.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

        this.geoms = [];
        this.circles = [];


        this.isDraw = false;
        this.isDrag = false;

        this.startX = -1;
        this.startY = -1;
        this.index = -1;
        this.circleIndex = -1;

        this.isRectChange = false;
        this.placement = '';
    }


    /**
     * 画出所有的图形
     */
    draw () {
        this.context.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

        for (let i = 0; i < this.geoms.length; i++) {
            const geom = this.geoms[i];
            const bgColor = geom.selected ? this.selectedBackgroundColor : this.backgroundColor;
            if (geom.shape === this.rectangle) {
                Rectangle.draw(this.context, geom.points, geom.color, bgColor);
            }

            if (geom.shape === this.polygon) {
                Polygon.drawCircles(this.context, geom.points, this.radius);
                Polygon.drawLines(this.context, geom.points, geom.color, bgColor);
            }
        }
    }


    /**
     * 删除
     * @param index
     */
    delete (index: number) {
        this.geoms.splice(index, 1);
        this.draw();
    }


    /**
     * 获取默认图形
     */
    getSelectedIndex (): number {
        return this.geoms.findIndex(item => item.selected);
    }

    /**
     * 选择默认图形
     * @param index
     */
    setSelected (index: number) {
        for (let i = 0; i < this.geoms.length; i++) {
            this.geoms[i].selected = false;
        }
        this.geoms[index].selected = true;
        this.draw();
    }


    /**
     * 将自定义配置赋值
     * @param canvasConfig
     */
    private configAssign (canvasConfig: CanvasConfig) {
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

        if (canvasConfig.onClick) {
            this.onClick = canvasConfig.onClick;
        }
    }


    /**
     * 拖动图形
     * @param e
     */
    private dragging (e: MouseEvent) {
        if (this.geoms[this.index].shape === this.rectangle) {
            const geom = this.geoms[this.index] as Rectangle;
            const x = geom.rect.x + e.movementX;
            const y = geom.rect.y + e.movementY;
            geom.setPointsRect(x, y, x + geom.rect.width, y + geom.rect.height);
            this.draw();
            this.onDragging && this.onDragging(geom, this.index);
        }

        if (this.geoms[this.index].shape === this.polygon) {
            const geom = this.geoms[this.index] as Polygon;
            if (this.circleIndex >= 0) {
                // 拖动的是单个的圆点
                geom.points[this.circleIndex].x += e.movementX;
                geom.points[this.circleIndex].y += e.movementY;

                this.onChangeSize && this.onChangeSize(geom, this.index, this.circleIndex);
            } else {
                // 拖动的是整个多边形
                geom.setPoints(geom.points.map(item => {
                    return {
                        x: item.x + e.movementX,
                        y: item.y + e.movementY
                    };
                }));

                this.onDragging && this.onDragging(geom, this.index);
            }

            this.draw();
        }
    }

    /**
     * 改变矩形大小
     * @param e
     */
    private rectResize (e: MouseEvent) {
        if (!this.geoms[this.index]) {
            return;
        }

        const geom = this.geoms[this.index] as Rectangle;
        const { x, y, width, height } = geom.rect;

        switch (this.placement) {
            case 'right': {
                if (e.offsetX >= this.oldRect.x) {
                    this.$canvas.style.cursor = 'e-resize';
                    geom.setPointsRect(this.oldRect.x, y, this.oldRect.x + width + e.movementX, y + height);
                } else {
                    this.$canvas.style.cursor = 'w-resize';
                    geom.setPointsRect(e.offsetX, y, this.oldRect.x, y + height);
                }
                break;
            }

            case 'bottom': {
                if (e.offsetY >= this.oldRect.y) {
                    this.$canvas.style.cursor = 's-resize';
                    geom.setPointsRect(x, this.oldRect.y, x + width, this.oldRect.y + height + e.movementY);
                } else {
                    this.$canvas.style.cursor = 'n-resize';
                    geom.setPointsRect(x, e.offsetY, x + width, this.oldRect.y);
                }
                break;
            }

            case 'left': {
                const endX = this.oldRect.x + this.oldRect.width;
                if (e.offsetX <= endX) {
                    this.$canvas.style.cursor = 'w-resize';
                    geom.setPointsRect(x + e.movementX, y, endX, y + height);
                } else {
                    this.$canvas.style.cursor = 'e-resize';
                    geom.setPointsRect(endX, y, e.offsetX, y + height);
                }
                break;
            }

            case 'top': {
                const endY = this.oldRect.y + this.oldRect.height;
                if (e.offsetY <= endY) {
                    this.$canvas.style.cursor = 'n-resize';
                    geom.setPointsRect(x, y + e.movementY, x + width, endY);
                } else {
                    this.$canvas.style.cursor = 's-resize';
                    geom.setPointsRect(x, endY, x + width, e.offsetY);
                }
                break;
            }

            case 'right-bottom': {
                // 右下拖动
                if (e.offsetX >= this.oldRect.x && e.offsetY >= this.oldRect.y) {
                    this.$canvas.style.cursor = 'se-resize';
                    geom.setPointsRect(this.oldRect.x, this.oldRect.y, this.oldRect.x + width + e.movementX, this.oldRect.y + height + e.movementY);
                }

                // 右上拖动
                if (e.offsetX >= this.oldRect.x && e.offsetY < this.oldRect.y) {
                    this.$canvas.style.cursor = 'ne-resize';
                    geom.setPointsRect(this.oldRect.x, e.offsetY, this.oldRect.x + width + e.movementX, this.oldRect.y);
                }

                // 左下拖动
                if (e.offsetX < this.oldRect.x && e.offsetY >= this.oldRect.y) {
                    this.$canvas.style.cursor = 'sw-resize';
                    geom.setPointsRect(e.offsetX, this.oldRect.y, this.oldRect.x, this.oldRect.y + height + e.movementY);
                }

                // 左上拖动
                if (e.offsetX < this.oldRect.x && e.offsetY < this.oldRect.y) {
                    this.$canvas.style.cursor = 'nw-resize';
                    geom.setPointsRect(e.offsetX, e.offsetY, this.oldRect.x, this.oldRect.y);
                }
                break;
            }

            case 'right-top': {
                const endY = this.oldRect.y + this.oldRect.height;
                // 右上拖动
                if (e.offsetX >= this.oldRect.x && e.offsetY <= endY) {
                    this.$canvas.style.cursor = 'ne-resize';
                    geom.setPointsRect(this.oldRect.x, y + e.movementY, this.oldRect.x + width + e.movementX, endY);
                }

                // 右下拖动
                if (e.offsetX >= this.oldRect.x && e.offsetY > endY) {
                    this.$canvas.style.cursor = 'se-resize';
                    geom.setPointsRect(this.oldRect.x, endY, this.oldRect.x + width + e.movementX, e.offsetY);
                }

                // 左上拖动
                if (e.offsetX < this.oldRect.x && e.offsetY <= endY) {
                    this.$canvas.style.cursor = 'nw-resize';
                    geom.setPointsRect(e.offsetX, y + e.movementY, this.oldRect.x, endY);
                }

                // 左下拖动
                if (e.offsetX < this.oldRect.x && e.offsetY > endY) {
                    this.$canvas.style.cursor = 'sw-resize';
                    geom.setPointsRect(e.offsetX, e.offsetY, this.oldRect.x, endY);
                }
                break;
            }

            case 'left-bottom': {
                const endX = this.oldRect.x + this.oldRect.width;

                // 左下拖动
                if (e.offsetX <= endX && e.offsetY >= this.oldRect.y) {
                    this.$canvas.style.cursor = 'sw-resize';
                    geom.setPointsRect(x + e.movementX, this.oldRect.y, endX, this.oldRect.y + height + e.movementY);
                }

                // 左上拖动
                if (e.offsetX <= endX && e.offsetY < this.oldRect.y) {
                    this.$canvas.style.cursor = 'nw-resize';
                    geom.setPointsRect(x + e.movementX, e.offsetY, endX, this.oldRect.y);
                }

                // 右下拖动
                if (e.offsetX > endX && e.offsetY >= this.oldRect.y) {
                    this.$canvas.style.cursor = 'se-resize';
                    geom.setPointsRect(endX, this.oldRect.y, e.offsetX, this.oldRect.y + height + e.movementY);
                }

                // 右上拖动
                if (e.offsetX > endX && e.offsetY < this.oldRect.y) {
                    this.$canvas.style.cursor = 'ne-resize';
                    geom.setPointsRect(endX, this.oldRect.y, e.offsetX, e.offsetY);
                }

                break;
            }

            case 'left-top': {
                const endX = this.oldRect.x + this.oldRect.width;
                const endY = this.oldRect.y + this.oldRect.height;

                // 左上拖动
                if (e.offsetX <= endX && e.offsetY <= endY) {
                    this.$canvas.style.cursor = 'nw-resize';
                    geom.setPointsRect(x + e.movementX, y + e.movementY, endX, endY);
                }

                // 左下拖动
                if (e.offsetX <= endX && e.offsetY > endY) {
                    this.$canvas.style.cursor = 'sw-resize';
                    geom.setPointsRect(x + e.movementX, endY, endX, e.offsetY);
                }

                // 右上拖动
                if (e.offsetX > endX && e.offsetY <= endY) {
                    this.$canvas.style.cursor = 'ne-resize';
                    geom.setPointsRect(endX, y + e.movementY, e.offsetX, endY);
                }

                // 右下拖动
                if (e.offsetX > endX && e.offsetY > endY) {
                    this.$canvas.style.cursor = 'se-resize';
                    geom.setPointsRect(endX, endY, e.offsetX, e.offsetY);
                }

                break;
            }
        }

        this.draw();

        this.onChangeSize && this.onChangeSize(geom, this.index);
    }


    /**
     * 判断鼠标样式
     * @param e
     */
    private mouseStyle (e: MouseEvent) {
        this.$canvas.style.cursor = 'crosshair';
        this.placement = '';
        this.index = -1;
        this.circleIndex = -1;


        for (let i = 0; i < this.geoms.length; i++) {
            if (this.geoms[i].shape === this.rectangle) {
                const geom = this.geoms[i] as Rectangle;
                const { x, y, width, height } = geom.rect;
                const maxX = x + width;
                const maxY = y + height;
                const distance = 10;

                /**
                 * 当改变矩形大小时，人们习惯于向右向下拖动，所以先判断右和下
                 */

                /**
                 * 从矩形右边缘减去 distance 开始，到矩形右边缘结束
                 * 从矩形上边缘加上 distance 开始，到矩形下边缘减去 distance 结束
                 * 鼠标样式为 e-resize （可向东移动）
                 */
                const rightX = e.offsetX > (maxX - distance) && e.offsetX <= maxX;
                const rightY = e.offsetY >= (y + distance) && e.offsetY <= (maxY - distance);
                if (rightX && rightY) {
                    this.$canvas.style.cursor = 'e-resize';
                    this.placement = 'right';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形右边缘减去 distance 开始，到矩形右边缘结束
                 * 从矩形下边缘减去 distance 开始，到矩形下边缘结束
                 * 鼠标样式为 se-resize （可向东南移动）
                 */
                const rightBottomY = e.offsetY > (maxY - distance) && e.offsetY <= maxY;
                if (rightX && rightBottomY) {
                    this.$canvas.style.cursor = 'se-resize';
                    this.placement = 'right-bottom';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形右边缘减去 distance 开始，到矩形右边缘结束
                 * 从矩形上边缘开始，到矩形上边缘加上 distance 结束
                 * 鼠标样式为 ne-resize （可向东北移动）
                 */
                const rightTopY = e.offsetY >= y && e.offsetY < (y + distance);
                if (rightX && rightTopY) {
                    this.$canvas.style.cursor = 'ne-resize';
                    this.placement = 'right-top';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘加上 distance 开始，到矩形右边缘减去 distance 结束
                 * 从矩形下边缘减去 distance 开始，到矩形下边缘结束
                 * 鼠标样式为 s-resize （可向南移动）
                 */
                const bottomX = e.offsetX >= (x + distance) && e.offsetX <= (maxX - distance);
                const bottomY = e.offsetY > (maxY - distance) && e.offsetY <= maxY;
                if (bottomX && bottomY) {
                    this.$canvas.style.cursor = 's-resize';
                    this.placement = 'bottom';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘加上 distance 开始，到矩形右边缘减去 distance 结束
                 * 从矩形上边缘开始，到矩形上边缘加上 distance 结束
                 * 鼠标样式为 n-resize （可向北移动）
                 */
                const topY = e.offsetY >= y && e.offsetY < (y + distance);
                if (bottomX && topY) {
                    this.$canvas.style.cursor = 'n-resize';
                    this.placement = 'top';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘开始，到矩形左边缘加上 distance 结束
                 * 从矩形上边缘加上 distance 开始，到矩形下边缘减去 distance 结束
                 * 鼠标样式为 w-resize （可向西移动）
                 */
                const leftX = e.offsetX >= x && e.offsetX < (x + distance);
                if (leftX && rightY) {
                    this.$canvas.style.cursor = 'w-resize';
                    this.placement = 'left';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘开始，到矩形左边缘加上 distance 结束
                 * 从矩形下边缘减去 distance 开始，到矩形下边缘结束
                 * 鼠标样式为 sw-resize （可向西南移动）
                 */
                if (leftX && bottomY) {
                    this.$canvas.style.cursor = 'sw-resize';
                    this.placement = 'left-bottom';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘开始，到矩形左边缘加上 distance 结束
                 * 从矩形上边缘开始，到矩形上边缘加上 distance 结束
                 * 鼠标样式为 nw-resize （可向西北移动）
                 */
                // const leftBottomX = e.offsetX >= x && e.offsetX < (x + distance);
                if (leftX && rightTopY) {
                    this.$canvas.style.cursor = 'nw-resize';
                    this.placement = 'left-top';
                    this.index = i;
                    return;
                }

                /**
                 * 从矩形左边缘加上 distance 开始，到矩形右边缘减去 distance 结束
                 * 从矩形上边缘加上 distance 开始，到矩形下边缘减去 distance 结束
                 * 鼠标样式为 move （可拖动）
                 */
                if (bottomX && rightY) {
                    this.$canvas.style.cursor = 'move';
                    this.placement = '';
                    this.index = i;
                    return;
                }
            }

            if (this.geoms[i].shape === this.polygon) {
                const geom = this.geoms[i] as Polygon;
                for (let j = 0; j < geom.points.length; j++) {
                    const point: Point = geom.points[j];
                    const disanceFromCenter = Math.sqrt(Math.pow(e.offsetX - point.x, 2) + Math.pow(e.offsetY - point.y, 2));

                    if (disanceFromCenter < this.radius) {
                        this.$canvas.style.cursor = 'default';
                        this.circleIndex = j;
                        this.index = i;
                        return;
                    }

                    Polygon.drawLines(this.context, geom.points, 'transparent', 'transparent');
                    if (this.context.isPointInPath(e.offsetX, e.offsetY)) {
                        this.$canvas.style.cursor = 'move';
                        this.index = i;
                        return;
                    }

                }
            }
        }
    }


    /**
     * 随机生成颜色
     */
    private randomColor (): string {
        let H = Math.floor(Math.random() * 361);
        const result = this.borderColor.match(/\d+/);
        const oldH = result ? Number(result[0]): 0;

        // 不至于两个随机颜色太相近
        while (Math.abs(oldH - H) < 60) {
            H = Math.floor(Math.random() * 361);
        }

        return `hsl(${H}, 100%, 50%)`;
    }


    /**
     * 正在画的矩形的处理过程
     * @param e
     */
    private drawingRectangle (e: MouseEvent) {
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

        this.onDrawing && this.onDrawing();
    }


    /**
     * 正在画的新多边形圆点的处理过程
     * @param e
     */
    private drawingPolygonCircle (e: MouseEvent) {
        if (!this.circles.length) {
            this.circles.push({ x: e.offsetX, y: e.offsetY });
            Polygon.drawCircle(this.context, this.circles[0], this.radius);

            this.onStart && this.onStart(this.polygon);
        } else {
            /**
             * 判断是否在第一个圆点之内
             * 是，就闭合
             * 不是，就添加新点
             */
            const distanceFromCenter = Math.sqrt(Math.pow(this.circles[0].x - e.offsetX, 2) + Math.pow(this.circles[0].y - e.offsetY, 2));

            if (distanceFromCenter > this.radius) {
                const point: Point = { x: e.offsetX, y: e.offsetY };
                this.circles.push(point);
                Polygon.drawCircle(this.context, point, this.radius);
            }

            if (distanceFromCenter <= this.radius) {
                const polygon = new Polygon(JSON.parse(JSON.stringify(this.circles)), this.borderColor);
                this.geoms.push(polygon);
                this.circles = [];
                this.setSelected(this.geoms.length - 1);

                this.onEnd && this.onEnd(polygon, this.geoms);
            }
        }
    }


    /**
     * 鼠标按键按下事件
     * @param e
     */
    private mousedown (e: MouseEvent) {
        this.startX = e.offsetX;
        this.startY = e.offsetY;

        // 画新图形
        if (this.$canvas.style.cursor === 'crosshair') {
            this.isDraw = true;
            if (!this.circles.length) {
                this.borderColor = this.randomColor();
            }
            return;
        }

        // 可拖动
        if (['move', 'default'].includes(this.$canvas.style.cursor)) {
            this.isDrag = true;
            return;
        }

        // 矩形改变大小
        const mouseResize = ['e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize'];
        if (mouseResize.includes(this.$canvas.style.cursor)) {
            this.isRectChange = true;
            const geom = this.geoms[this.index] as Rectangle;
            this.oldRect = Object.assign({}, geom.rect);
            return;
        }
    }


    /**
     * 鼠标滑动事件
     * @param e
     */
    private mousemove (e: MouseEvent) {
        // 画矩形
        if (this.isDraw && !this.circles.length) {
            this.drawingRectangle(e);
            return;
        }


        // 画多边形
        if (this.circles.length) {
            this.draw();
            Polygon.drawCircles(this.context, this.circles, this.radius);
            Polygon.drawLines(this.context, this.circles.concat([{x: e.offsetX, y: e.offsetY}]), this.borderColor, this.backgroundColor);

            this.onDrawing && this.onDrawing();

            return;
        }


        if (this.isDrag) {
            this.dragging(e);
            return;
        }


        if (this.isRectChange) {
            this.rectResize(e);
            return;
        }


        // 确定鼠标样式
        this.mouseStyle(e);
    }


    /**
     * 鼠标按键松开事件
     * @param e
     */
    private mouseup (e: MouseEvent) {
        if (this.isDraw && this.startX !== e.offsetX && this.startY !== e.offsetY && !this.circles.length) {
            const rectangle = new Rectangle(this.startX, this.startY, e.offsetX, e.offsetY, this.borderColor);
            this.geoms.push(rectangle);
            this.onEnd && this.onEnd(rectangle, this.geoms);
            this.setSelected(this.geoms.length - 1);
        }

        if (this.isDraw && this.startX === e.offsetX && this.startY === e.offsetY) {
            this.drawingPolygonCircle(e);
        }

        // 选择默认图形
        if ((this.isDrag || this.isRectChange) && this.startX === e.offsetX && this.startY === e.offsetY) {
            this.setSelected(this.index);
            this.onClick && this.onClick(this.geoms[this.index], this.index);
        }

        this.startX = -1;
        this.startY = -1;
        this.isDraw = false;
        this.isDrag = false;
        this.isRectChange = false;


        if (this.canvasConfig && this.canvasConfig.onStart) {
            this.onStart = this.canvasConfig.onStart;
        }
    }
}
