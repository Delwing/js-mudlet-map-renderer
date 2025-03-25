declare namespace paper {
    interface Item {
        registerClick: (callback: () => {}) => void
        pointerReactor: (element: HTMLElement | paper.SizeLike) => void
        select: (selectionFunction?: ((element: paper.Item) => paper.Style)) => void
        closed: boolean
    }

    interface Point {
        negate: () => Point
    }

    interface Path {
        orgStrokeColor: paper.Color
    }
}

