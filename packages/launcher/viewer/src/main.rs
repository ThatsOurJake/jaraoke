use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::{Fullscreen, WindowBuilder},
};
use wry::WebViewBuilder;

fn main() {
    let url = std::env::args().nth(1).unwrap_or_else(|| {
        eprintln!("viewer: URL argument is required");
        std::process::exit(1);
    });

    let event_loop = EventLoop::new();

    let window = WindowBuilder::new()
        .with_title("Jaraoke")
        .with_fullscreen(Some(Fullscreen::Borderless(None)))
        .build(&event_loop)
        .unwrap_or_else(|e| {
            eprintln!("viewer: failed to create window: {e}");
            std::process::exit(1);
        });

    let _webview = WebViewBuilder::new()
        .with_url(url)
        .build(&window)
        .unwrap_or_else(|e| {
            eprintln!("viewer: failed to create webview: {e}");
            std::process::exit(1);
        });

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}
