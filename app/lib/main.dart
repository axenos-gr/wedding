import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

List<CameraDescription> cameras = [];

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  cameras = await availableCameras();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Media Uploader',
      theme: ThemeData.dark(),
      home: const CameraScreen(),
    );
  }
}

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  late CameraController _controller;
  bool _isRecording = false;
  OverlayEntry? _overlayEntry;

  final String serverUrl = "https://api.axerium.org/upload";

  @override
  void initState() {
    super.initState();
    _controller = CameraController(cameras[0], ResolutionPreset.high);
    _controller.initialize().then((_) {
      if (!mounted) return;
      setState(() {});
    }).catchError((e) {
      debugPrint("Camera initialization error: $e");
    });
  }

  @override
  void dispose() {
    _overlayEntry?.remove();
    _controller.dispose();
    super.dispose();
  }

  void showStatus(String message, Color color) {
    _overlayEntry?.remove();

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: 50,
        left: 20,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.9),
              borderRadius: BorderRadius.circular(20),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
            ),
            child: Text(
              message,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_overlayEntry!);

    Future.delayed(const Duration(seconds: 3), () {
      _overlayEntry?.remove();
      _overlayEntry = null;
    });
  }

  Future<void> uploadMedia(XFile file) async {
    showStatus("Uploading...", Colors.blueAccent);
    
    try {
      var request = http.MultipartRequest('POST', Uri.parse(serverUrl));
      request.files.add(await http.MultipartFile.fromPath('media', file.path));
      
      var streamedResponse = await request.send().timeout(const Duration(minutes: 5));
      
      if (streamedResponse.statusCode == 200) {
        showStatus("Upload successful!", Colors.green);
      } else {
        showStatus("Upload failed (Code: ${streamedResponse.statusCode})", Colors.red);
      }
    } catch (e) {
      showStatus("Network error!", Colors.red);
    }
  }

  void takePhoto() async {
    if (!_controller.value.isInitialized || _isRecording) return;
    try {
      final file = await _controller.takePicture();
      uploadMedia(file);
    } catch (e) {
      debugPrint("Error taking photo: $e");
    }
  }

  void toggleVideo() async {
    if (!_controller.value.isInitialized) return;

    try {
      if (_isRecording) {
        final file = await _controller.stopVideoRecording();
        setState(() => _isRecording = false);
        uploadMedia(file);
      } else {
        await _controller.startVideoRecording();
        setState(() => _isRecording = true);
      }
    } catch (e) {
      debugPrint("Error handling video: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_controller.value.isInitialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: CameraPreview(_controller),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 40.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  FloatingActionButton(
                    heroTag: "photo_btn",
                    onPressed: takePhoto,
                    backgroundColor: Colors.white,
                    child: const Icon(Icons.camera_alt, color: Colors.black),
                  ),
                  FloatingActionButton(
                    heroTag: "video_btn",
                    onPressed: toggleVideo,
                    backgroundColor: _isRecording ? Colors.red : Colors.white,
                    child: Icon(
                      _isRecording ? Icons.stop : Icons.videocam, 
                      color: _isRecording ? Colors.white : Colors.black
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
