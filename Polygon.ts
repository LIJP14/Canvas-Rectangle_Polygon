export interface Point {
    x: number;
    y: number;
}


export class Polygon {
    readonly shape = 'polygon';
    points: Array<Point> = [];
    color = 'black'; // 边框颜色
    selected = false;

    constructor (points: Array<Point>, color: string, selected = false) {
        this.points = points;
        this.color = color;
        this.selected = false;
    }

    setPoints (points: Array<Point>) {
        this.points = points;
    }

    /**
     * 画多边形的所有圆点
     * @param context
     * @param points
     * @param radius
     * @param borderColor
     * @param backgroundColor
     */
    static drawCircle (context: CanvasRenderingContext2D, point: Point, radius: number, borderColor = 'black', backgroundColor = 'red') {
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, 2 * Math.PI);

        context.strokeStyle = borderColor;
        context.stroke();

        context.globalAlpha = 0.5;
        context.fillStyle = backgroundColor;
        context.fill();
        context.globalAlpha = 1;

    }

    static drawCircles (context: CanvasRenderingContext2D, points: Array<Point>, radius: number, borderColor = 'black', backgroundColor = 'red') {
        for (let i = 0; i < points.length; i++) {
            Polygon.drawCircle(context, points[i], radius, borderColor, backgroundColor);
        }
    }

    static drawLines (context: CanvasRenderingContext2D, points: Array<Point>, borderColor: string, backgroundColor: string) {
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const point: Point = points[i];
            context.lineTo(point.x, point.y);
        }
        context.closePath();

        context.strokeStyle = borderColor;
        context.stroke();

        context.fillStyle = backgroundColor;
        context.fill();
    }
}

